#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { program } from 'commander';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt-template.js';
import { gerarDashboardHTML } from './dashboard-template.js';

dotenv.config();

program
  .name('gerar-relatorio')
  .description('Gera relatório gerencial + dashboard a partir de CSV do Jira')
  .requiredOption('--csv <arquivo>', 'Caminho para o arquivo CSV exportado do Jira')
  .option('--obs <texto>', 'Observações adicionais para incluir no relatório')
  .option('--output <pasta>', 'Pasta de saída', 'output')
  .option('--modelo <modelo>', 'Modelo do Gemini a usar', 'gemini-2.5-flash')
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

main().catch((err) => {
  console.error('❌ Erro:', err.message || err);
  process.exit(1);
});
