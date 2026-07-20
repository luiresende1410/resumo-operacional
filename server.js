import express from 'express';
import multer from 'multer';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt-template.js';
import { gerarDashboardHTML } from './dashboard-template.js';
import { RELATORIO_HTML_SYSTEM_PROMPT, buildRelatorioUserPrompt, gerarRelatorioHTML } from './relatorio-html-template.js';
import { RESUMO_TIME_SYSTEM_PROMPT, buildResumoTimeUserPrompt, gerarResumoTimeHTML } from './resumo-time-template.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para gerar relatório
// Usa upload.any() para aceitar arquivo + campos de texto sem complicação
app.post('/api/gerar', upload.any(), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada. Edite o arquivo .env na raiz do projeto.' });
    }

    // Pegar o arquivo CSV
    const csvFile = req.files && req.files.find(f => f.fieldname === 'csv');
    if (!csvFile) {
      return res.status(400).json({ error: 'Nenhum arquivo CSV enviado.' });
    }

    const csvRaw = csvFile.buffer.toString('utf-8');
    const destaquesClientes = req.body.destaquesClientes || '';
    const destaquesProfissionais = req.body.destaquesProfissionais || '';

    // Parse CSV
    const records = parse(csvRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV vazio ou sem registros válidos.' });
    }

    // Montar observações extras
    let observacoes = '';
    if (destaquesClientes.trim()) {
      observacoes += 'Destaques de Clientes informados pelo gestor:\n' + destaquesClientes + '\n\n';
    }
    if (destaquesProfissionais.trim()) {
      observacoes += 'Destaques de Profissionais informados pelo gestor:\n' + destaquesProfissionais + '\n\n';
    }

    // Chamar Gemini
    console.log('[API] Chamando Gemini com', records.length, 'registros...');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildUserPrompt(csvRaw, observacoes),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 65536,
      },
    });

    const textoCompleto = response.text;
    if (!textoCompleto) {
      return res.status(500).json({ error: 'Gemini não retornou resposta.' });
    }

    // Separar relatório do JSON de métricas
    const separador = '---METRICAS_JSON---';
    let relatorio, metricas;

    if (textoCompleto.includes(separador)) {
      const partes = textoCompleto.split(separador);
      relatorio = partes[0].trim();

      let jsonStr = partes[1].trim();
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

      try {
        metricas = JSON.parse(jsonStr);
      } catch (e) {
        metricas = calcularMetricas(records);
      }
    } else {
      relatorio = textoCompleto.trim();
      metricas = calcularMetricas(records);
    }

    // Gerar dashboard HTML
    const dataHoje = new Date().toISOString().split('T')[0];
    const dashboardHTML = gerarDashboardHTML(metricas, dataHoje);

    console.log('[API] Relatório gerado com sucesso.');
    res.json({
      relatorio,
      metricas,
      dashboardHTML,
      totalRegistros: records.length,
    });
  } catch (err) {
    console.error('[API] Erro:', err.message || err);
    res.status(500).json({ error: err.message || 'Erro interno ao gerar relatório.' });
  }
});

// Endpoint para gerar relatório HTML estilizado (visão completa com sidebar)
app.post('/api/gerar-html', upload.any(), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });
    }

    const csvFile = req.files && req.files.find(f => f.fieldname === 'csv');
    if (!csvFile) {
      return res.status(400).json({ error: 'Nenhum arquivo CSV enviado.' });
    }

    const csvRaw = csvFile.buffer.toString('utf-8');
    const destaquesClientes = req.body.destaquesClientes || '';
    const destaquesProfissionais = req.body.destaquesProfissionais || '';
    const periodoInformado = req.body.periodo || '';

    let observacoes = '';
    if (periodoInformado.trim()) observacoes += 'Período do relatório: ' + periodoInformado + '\n\n';
    if (destaquesClientes.trim()) observacoes += 'Destaques de Clientes:\n' + destaquesClientes + '\n\n';
    if (destaquesProfissionais.trim()) observacoes += 'Destaques de Profissionais:\n' + destaquesProfissionais + '\n\n';

    console.log('[API] Gerando relatório HTML estilizado...');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildRelatorioUserPrompt(csvRaw, observacoes),
      config: {
        systemInstruction: RELATORIO_HTML_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 65536,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      return res.status(500).json({ error: 'Gemini não retornou resposta.' });
    }

    let relatorioData;
    try {
      const cleanJson = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      relatorioData = JSON.parse(cleanJson);
    } catch (e) {
      return res.status(500).json({ error: 'Não foi possível parsear a resposta do Gemini como JSON.' });
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const relatorioHTMLContent = gerarRelatorioHTML(relatorioData, dataHoje);

    console.log('[API] Relatório HTML gerado com sucesso.');
    res.json({ relatorioHTML: relatorioHTMLContent });
  } catch (err) {
    console.error('[API] Erro:', err.message || err);
    res.status(500).json({ error: err.message || 'Erro interno.' });
  }
});

// Endpoint para gerar Resumo Gerencial do Time (visão executiva focada no time)
app.post('/api/gerar-resumo-time', upload.any(), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });
    }

    const csvFile = req.files && req.files.find(f => f.fieldname === 'csv');
    if (!csvFile) {
      return res.status(400).json({ error: 'Nenhum arquivo CSV enviado.' });
    }

    const csvRaw = csvFile.buffer.toString('utf-8');
    const destaquesClientes = req.body.destaquesClientes || '';
    const destaquesProfissionais = req.body.destaquesProfissionais || '';
    const periodoInformado = req.body.periodo || '';

    let observacoes = '';
    if (periodoInformado.trim()) observacoes += 'Período do relatório: ' + periodoInformado + '\n\n';
    if (destaquesClientes.trim()) observacoes += 'Destaques de Clientes:\n' + destaquesClientes + '\n\n';
    if (destaquesProfissionais.trim()) observacoes += 'Destaques de Profissionais:\n' + destaquesProfissionais + '\n\n';

    console.log('[API] Gerando Resumo Gerencial do Time...');
    const ai = new GoogleGenAI({ apiKey });

    // Calcular métricas localmente para garantir dados corretos
    const records = parse(csvRaw, { columns: true, skip_empty_lines: true, trim: true });
    const metricasLocais = calcularMetricasTime(records);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildResumoTimeUserPrompt(csvRaw, observacoes, metricasLocais),
      config: {
        systemInstruction: RESUMO_TIME_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 65536,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      return res.status(500).json({ error: 'Gemini não retornou resposta.' });
    }

    let resumoData;
    try {
      const cleanJson = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      resumoData = JSON.parse(cleanJson);
    } catch (e) {
      return res.status(500).json({ error: 'Não foi possível parsear a resposta do Gemini como JSON.' });
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    
    // Sobrescrever KPIs com valores calculados localmente (Gemini pode inventar)
    resumoData.kpis = {
      totalAtividades: metricasLocais.totalAtividades,
      totalHoras: metricasLocais.totalHoras,
      totalClientes: metricasLocais.totalClientes,
      totalProfissionais: metricasLocais.totalProfissionais,
      mediaHorasPorProfissional: metricasLocais.mediaHorasPorProfissional,
    };
    
    // Corrigir horas por cliente se houver dados
    if (resumoData.atividadesPorCliente) {
      for (const item of resumoData.atividadesPorCliente) {
        const clienteKey = Object.keys(metricasLocais.horasPorCliente).find(
          k => k.toUpperCase() === item.cliente.toUpperCase()
        );
        if (clienteKey) {
          item.horas = Math.round(metricasLocais.horasPorCliente[clienteKey] * 10) / 10;
        }
      }
    }

    const resumoHTML = gerarResumoTimeHTML(resumoData, dataHoje);

    console.log('[API] Resumo do Time gerado com sucesso.');
    res.json({ resumoHTML });
  } catch (err) {
    console.error('[API] Erro:', err.message || err);
    res.status(500).json({ error: err.message || 'Erro interno.' });
  }
});

// Endpoint de preview (validação do CSV)
app.post('/api/preview', upload.any(), (req, res) => {
  try {
    const csvFile = req.files && req.files.find(f => f.fieldname === 'csv');
    if (!csvFile) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const csvRaw = csvFile.buffer.toString('utf-8');
    const records = parse(csvRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV vazio.' });
    }

    const clientes = [...new Set(records.map(r => r.Cliente).filter(Boolean))];
    const profissionais = [...new Set(records.map(r => r.Nome).filter(Boolean))];
    const totalHoras = records.reduce((s, r) => s + (parseFloat(r.Horas) || 0), 0);

    res.json({
      totalRegistros: records.length,
      clientes,
      profissionais,
      totalHoras: Math.round(totalHoras * 100) / 100,
    });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao ler CSV: ' + err.message });
  }
});

function calcularMetricasTime(records) {
  const horasPorCliente = {};
  const horasPorProfissional = {};
  const atividadesPorStatus = {};
  let totalHoras = 0;

  for (const r of records) {
    const cliente = r.Cliente || 'Sem cliente';
    const nome = r.Nome || 'Não identificado';
    const status = r.Status || 'Sem status';
    const horas = parseFloat(r.Horas) || 0;

    totalHoras += horas;
    horasPorCliente[cliente] = (horasPorCliente[cliente] || 0) + horas;
    horasPorProfissional[nome] = (horasPorProfissional[nome] || 0) + horas;
    atividadesPorStatus[status] = (atividadesPorStatus[status] || 0) + 1;
  }

  const totalClientes = Object.keys(horasPorCliente).length;
  const totalProfissionais = Object.keys(horasPorProfissional).length;
  const totalAtividades = records.length;
  const mediaHorasPorProfissional = totalProfissionais > 0 ? Math.round((totalHoras / totalProfissionais) * 10) / 10 : 0;

  return {
    totalAtividades,
    totalHoras: Math.round(totalHoras * 10) / 10,
    totalClientes,
    totalProfissionais,
    mediaHorasPorProfissional,
    horasPorCliente,
    horasPorProfissional,
    atividadesPorStatus,
  };
}

function calcularMetricas(records) {
  const horasPorCliente = {};
  const horasPorProfissional = {};
  const atividadesPorStatus = {};
  let totalHoras = 0;

  for (const r of records) {
    const cliente = r.Cliente || 'Sem cliente';
    const nome = r.Nome || 'Não identificado';
    const status = r.Status || 'Sem status';
    const horas = parseFloat(r.Horas) || 0;

    totalHoras += horas;
    horasPorCliente[cliente] = (horasPorCliente[cliente] || 0) + horas;
    horasPorProfissional[nome] = (horasPorProfissional[nome] || 0) + horas;
    atividadesPorStatus[status] = (atividadesPorStatus[status] || 0) + 1;
  }

  const datas = records.map(r => r.Data).filter(Boolean).sort();
  const periodo = datas.length > 0 ? `${datas[0]} a ${datas[datas.length - 1]}` : 'Período não identificado';

  const topClientes = Object.entries(horasPorCliente)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  return {
    periodo,
    totalAtividades: records.length,
    totalHoras: Math.round(totalHoras * 100) / 100,
    horasPorCliente,
    horasPorProfissional,
    atividadesPorStatus,
    distribuicaoEsforco: {
      'Segurança e Governança': 25,
      'Infraestrutura / DevOps': 30,
      'Sustentação e Incidentes': 30,
      'FinOps / Otimização de Custos': 15,
    },
    topClientes,
  };
}

app.listen(PORT, () => {
  console.log('');
  console.log('===========================================');
  console.log('  Servidor rodando em http://localhost:' + PORT);
  console.log('  Abra no navegador para usar.');
  console.log('===========================================');
  console.log('');
});
