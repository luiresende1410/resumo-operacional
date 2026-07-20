#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { program } from 'commander';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt-template.js';
import { gerarDashboardHTML } from './dashboard-template.js';
import { RELATORIO_HTML_SYSTEM_PROMPT, buildRelatorioUserPrompt, gerarRelatorioHTML } from './relatorio-html-template.js';
import { RESUMO_TIME_SYSTEM_PROMPT, buildResumoTimeUserPrompt, gerarResumoTimeHTML } from './resumo-time-template.js';

dotenv.config();

program
  .name('gerar-relatorio')
  .description('Gera relatório gerencial + dashboard a partir de CSV do Jira')
  .requiredOption('--csv <arquivo>', 'Caminho para o arquivo CSV exportado do Jira')
  .option('--obs <texto>', 'Observações adicionais para incluir no relatório')
  .option('--output <pasta>', 'Pasta de saída', 'output')
  .option('--modelo <modelo>', 'Modelo do Gemini a usar', 'gemini-2.5-flash')
  .option('--html', 'Gerar também o relatório HTML estilizado com navegação lateral')
  .option('--time', 'Gerar resumo gerencial focado no time (visão executiva para diretoria)')
  .parse();

const opts = program.opts();

async function main() {
  // Validar API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY não encontrada. Crie um arquivo .env com sua chave.');
    console.error('   Obtenha em: https://aistudio.google.com/app/apikey');
    process.exit(1);
  }

  // Ler CSV
  if (!existsSync(opts.csv)) {
    console.error(`❌ Arquivo não encontrado: ${opts.csv}`);
    process.exit(1);
  }

  console.log(`📄 Lendo CSV: ${opts.csv}`);
  const csvRaw = readFileSync(opts.csv, 'utf-8');

  // Validar estrutura do CSV
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    console.error('❌ CSV vazio ou sem registros válidos.');
    process.exit(1);
  }

  const colunasEsperadas = ['Data', 'Cliente', 'Resumo', 'Nome', 'Comentário', 'Link', 'Status', 'Horas'];
  const colunasPresentes = Object.keys(records[0]);
  const faltando = colunasEsperadas.filter(c => !colunasPresentes.includes(c));

  if (faltando.length > 0) {
    console.warn(`⚠️  Colunas esperadas não encontradas: ${faltando.join(', ')}`);
    console.warn(`   Colunas presentes no CSV: ${colunasPresentes.join(', ')}`);
    console.warn('   Continuando mesmo assim...\n');
  }

  console.log(`✅ ${records.length} atividades encontradas no CSV`);

  // Calcular métricas locais (fallback caso o Gemini não retorne JSON válido)
  const metricasLocais = calcularMetricas(records);

  // Chamar Gemini
  console.log(`🤖 Chamando Gemini (${opts.modelo})...`);
  
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: opts.modelo,
    contents: buildUserPrompt(csvRaw, opts.obs),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  const textoCompleto = response.text;

  if (!textoCompleto) {
    console.error('❌ Gemini não retornou resposta.');
    process.exit(1);
  }

  // Separar relatório do JSON de métricas
  const separador = '---METRICAS_JSON---';
  let relatorio, metricas;

  if (textoCompleto.includes(separador)) {
    const partes = textoCompleto.split(separador);
    relatorio = partes[0].trim();
    
    // Extrair JSON (pode vir com crases de markdown)
    let jsonStr = partes[1].trim();
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    
    try {
      metricas = JSON.parse(jsonStr);
      console.log('✅ Métricas extraídas do relatório');
    } catch (e) {
      console.warn('⚠️  Não foi possível parsear métricas do Gemini, usando cálculo local');
      metricas = metricasLocais;
    }
  } else {
    relatorio = textoCompleto.trim();
    metricas = metricasLocais;
    console.warn('⚠️  Gemini não retornou bloco de métricas, usando cálculo local');
  }

  // Criar pasta de saída
  if (!existsSync(opts.output)) {
    mkdirSync(opts.output, { recursive: true });
  }

  // Salvar relatório
  const dataHoje = new Date().toISOString().split('T')[0];
  const relatorioPath = `${opts.output}/relatorio-${dataHoje}.md`;
  writeFileSync(relatorioPath, relatorio, 'utf-8');
  console.log(`📝 Relatório salvo: ${relatorioPath}`);

  // Gerar e salvar dashboard
  const dashboardHTML = gerarDashboardHTML(metricas, dataHoje);
  const dashboardPath = `${opts.output}/dashboard-${dataHoje}.html`;
  writeFileSync(dashboardPath, dashboardHTML, 'utf-8');
  console.log(`📊 Dashboard salvo: ${dashboardPath}`);

  // Gerar relatório HTML estilizado (se --html)
  if (opts.html) {
    console.log('🎨 Gerando relatório HTML estilizado...');

    const responseHTML = await ai.models.generateContent({
      model: opts.modelo,
      contents: buildRelatorioUserPrompt(csvRaw, opts.obs),
      config: {
        systemInstruction: RELATORIO_HTML_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 65536,
      },
    });

    const jsonText = responseHTML.text;
    let relatorioData;

    try {
      const cleanJson = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      relatorioData = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('⚠️  Não foi possível parsear JSON do relatório HTML, usando dados básicos');
      relatorioData = buildFallbackData(records, metricas);
    }

    const relatorioHTMLContent = gerarRelatorioHTML(relatorioData, dataHoje);
    const htmlPath = `${opts.output}/relatorio-${dataHoje}.html`;
    writeFileSync(htmlPath, relatorioHTMLContent, 'utf-8');
    console.log(`🎨 Relatório HTML salvo: ${htmlPath}`);
  }

  // Gerar resumo do time (se --time)
  if (opts.time) {
    console.log('👥 Gerando resumo gerencial do time...');

    const responseTime = await ai.models.generateContent({
      model: opts.modelo,
      contents: buildResumoTimeUserPrompt(csvRaw, opts.obs),
      config: {
        systemInstruction: RESUMO_TIME_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 65536,
      },
    });

    const jsonTextTime = responseTime.text;
    let resumoData;

    try {
      const cleanJson = jsonTextTime.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      resumoData = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('⚠️  Não foi possível parsear JSON do resumo do time, usando dados básicos');
      resumoData = buildFallbackResumoTime(records, metricasLocais);
    }

    const resumoTimeHTMLContent = gerarResumoTimeHTML(resumoData, dataHoje);
    const timePath = `${opts.output}/resumo-time-${dataHoje}.html`;
    writeFileSync(timePath, resumoTimeHTMLContent, 'utf-8');
    console.log(`👥 Resumo do Time salvo: ${timePath}`);
  }

  console.log('\n🎉 Pronto! Abra o dashboard no navegador para visualizar.');
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

  // Determinar período
  const datas = records
    .map(r => r.Data)
    .filter(Boolean)
    .sort();
  
  const periodo = datas.length > 0
    ? `${datas[0]} a ${datas[datas.length - 1]}`
    : 'Período não identificado';

  // Top clientes por horas
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

function buildFallbackResumoTime(records, metricas) {
  const profissionais = [...new Set(records.map(r => r.Nome).filter(Boolean))];
  const clientes = [...new Set(records.map(r => r.Cliente).filter(Boolean))];

  return {
    periodo: metricas.periodo,
    resumoExecutivo: `Semana com ${metricas.totalAtividades} atividades e ${metricas.totalHoras}h registradas, atendendo ${clientes.length} clientes com ${profissionais.length} profissionais.`,
    kpis: {
      totalAtividades: metricas.totalAtividades,
      totalHoras: metricas.totalHoras,
      totalClientes: clientes.length,
      totalProfissionais: profissionais.length,
      mediaHorasPorProfissional: Math.round((metricas.totalHoras / (profissionais.length || 1)) * 10) / 10,
    },
    atividadesPorCliente: clientes.map(c => ({
      cliente: c,
      atividades: records.filter(r => r.Cliente === c).length,
      horas: Math.round(records.filter(r => r.Cliente === c).reduce((s, r) => s + (parseFloat(r.Horas) || 0), 0) * 10) / 10,
      principaisEntregas: records.filter(r => r.Cliente === c).slice(0, 2).map(r => r.Resumo || 'Atividade'),
    })),
    atividadesPorPilar: [
      { pilar: 'Segurança e Governança', percentual: 25, atividades: 0, horas: 0, destaques: [] },
      { pilar: 'Infraestrutura / DevOps', percentual: 30, atividades: 0, horas: 0, destaques: [] },
      { pilar: 'Sustentação e Incidentes', percentual: 30, atividades: 0, horas: 0, destaques: [] },
      { pilar: 'FinOps / Otimização de Custos', percentual: 15, atividades: 0, horas: 0, destaques: [] },
    ],
    topAtividades: records.slice(0, 5).map(r => ({
      titulo: r.Resumo || 'Atividade', cliente: r.Cliente || '-', profissional: r.Nome || '-', horas: parseFloat(r.Horas) || 0, impacto: '',
    })),
    destaquesProfissionais: profissionais.map(nome => ({
      nome,
      iniciais: nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      horas: Math.round(records.filter(r => r.Nome === nome).reduce((s, r) => s + (parseFloat(r.Horas) || 0), 0) * 10) / 10,
      atividades: records.filter(r => r.Nome === nome).length,
      clientes: [...new Set(records.filter(r => r.Nome === nome).map(r => r.Cliente).filter(Boolean))],
      destaque: 'Contribuição nas atividades do período.',
    })),
    volumePorStatus: metricas.atividadesPorStatus,
  };
}

function buildFallbackData(records, metricas) {
  const profissionais = [...new Set(records.map(r => r.Nome).filter(Boolean))].map(nome => ({
    nome,
    iniciais: nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    descricao: 'Contribuição nas atividades operacionais do período.',
  }));

  const clientes = [...new Set(records.map(r => r.Cliente).filter(Boolean))];

  return {
    periodo: metricas.periodo,
    sumarioExecutivo: {
      texto: 'Relatório gerado automaticamente a partir dos dados do Jira.',
      focoEstrategico: `Período com ${metricas.totalAtividades} atividades e ${metricas.totalHoras} horas registradas.`,
    },
    distribuicaoEsforco: {
      pilares: Object.entries(metricas.distribuicaoEsforco).map(([nome, percentual]) => ({
        nome, percentual, descricao: '',
      })),
    },
    seguranca: [],
    finops: [],
    modernizacao: [],
    observabilidade: [],
    relacionamento: clientes.slice(0, 3).map(c => ({
      cliente: c, status: 'Positivo', destaque: 'Atividades realizadas conforme planejado.',
    })),
    profissionais,
    metricas,
  };
}

main().catch((err) => {
  console.error('❌ Erro:', err.message || err);
  process.exit(1);
});
