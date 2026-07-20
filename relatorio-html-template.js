/**
 * Template para gerar o relatório gerencial em HTML estilizado.
 * Gera uma página com navegação lateral, gráficos e seções estruturadas.
 */

// System prompt que instrui o Gemini a retornar JSON estruturado
export const RELATORIO_HTML_SYSTEM_PROMPT = `Você é um Especialista em Operações de Cloud e Líder de Engenharia de Confiabilidade (SRE). Sua tarefa é transformar uma lista de demandas e atividades técnicas em um "Resumo Gerencial - Cloud Management Services" altamente profissional, consultivo e estruturado.

IMPORTANTE: Você deve gerar a resposta como um JSON válido. NÃO gere Markdown. Gere APENAS o JSON.

### INSTRUÇÕES DE FORMATAÇÃO E ESTILO:
1. Agrupe as atividades brutas por contexto e cliente.
2. Traduza termos técnicos para impactos de negócio quando apropriado.
3. Identifique proativamente falhas críticas ou vulnerabilidades e destaque-as.
4. Mantenha os nomes dos clientes em CAIXA ALTA.

### ESTRUTURA DO JSON:
{
  "periodo": "DD/MM a DD/MM",
  "sumarioExecutivo": {
    "texto": "Parágrafo de 3-4 linhas resumindo esforços estratégicos da semana nos pilares: Segurança, Otimização de Custos, Modernização e Sustentação.",
    "focoEstrategico": "Parágrafo expandido sobre governança e crescimento seguro dos ambientes."
  },
  "distribuicaoEsforco": {
    "pilares": [
      { "nome": "Segurança e Governança", "percentual": <N>, "descricao": "Breve resumo..." },
      { "nome": "Infraestrutura / DevOps", "percentual": <N>, "descricao": "..." },
      { "nome": "Sustentação e Incidentes", "percentual": <N>, "descricao": "..." },
      { "nome": "FinOps / Otimização de Custos", "percentual": <N>, "descricao": "..." }
    ]
  },
  "seguranca": [
    { "cliente": "NOME", "titulo": "Título da entrega", "descricao": "Descrição do impacto." }
  ],
  "finops": [
    { "cliente": "NOME", "titulo": "Título", "descricao": "Descrição..." }
  ],
  "modernizacao": [
    { "cliente": "NOME", "titulo": "Título", "descricao": "Descrição..." }
  ],
  "observabilidade": [
    { "cliente": "NOME", "titulo": "Título", "descricao": "Descrição..." }
  ],
  "relacionamento": [
    { "cliente": "NOME", "status": "Positivo|Em evolução|Crítico", "destaque": "Explicação..." }
  ],
  "profissionais": [
    { "nome": "Nome Completo", "iniciais": "NC", "descricao": "Reconhecimento..." }
  ],
  "metricas": {
    "totalAtividades": <N>,
    "totalHoras": <N>,
    "horasPorCliente": { "CLIENTE": <horas> },
    "horasPorProfissional": { "Nome": <horas> },
    "atividadesPorStatus": { "Status": <qtd> },
    "topClientes": ["CLIENTE1", "CLIENTE2"]
  }
}

Calcule os valores com base nos dados brutos. Os percentuais devem somar 100%.
Gere de 3 a 7 itens por pilar. 2 a 4 itens em relacionamento. Um item por profissional.
RESPONDA APENAS COM O JSON, sem crases markdown, sem texto adicional.`;


export function buildRelatorioUserPrompt(csvContent, observacoes = '') {
  let prompt = `Lista de atividades da semana (CSV):\n\n${csvContent}`;
  if (observacoes) {
    prompt += `\n\nObservações do gestor (use o período informado exatamente como fornecido):\n${observacoes}`;
  }
  prompt += `\n\nGere o JSON estruturado conforme instruído. Se o período foi informado nas observações, use-o no campo "periodo".`;
  return prompt;
}

export function gerarRelatorioHTML(relatorio, dataGeracao) {
  const {
    periodo, sumarioExecutivo, distribuicaoEsforco,
    seguranca, finops, modernizacao, observabilidade,
    relacionamento, profissionais, metricas,
  } = relatorio;

  const pilares = distribuicaoEsforco?.pilares || [];
  const pilarLabels = JSON.stringify(pilares.map(p => p.nome));
  const pilarValues = JSON.stringify(pilares.map(p => p.percentual));

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resumo Gerencial - Cloud Management Services</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<style>
${CSS_CONTENT}
</style>
</head>
<body>

<nav class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="logo-box"><span>CLOUD</span><span>DOG</span></div>
    <div class="logo-text">Management Services</div>
  </div>
  <ul class="nav-links">
    <li><a href="#sumario">\u{1F4CB} Sumário Executivo</a></li>
    <li><a href="#esforco">\u{1F4CA} Esforço Operacional</a></li>
    <li><a href="#seguranca">\u{1F6E1} Segurança e Governança</a></li>
    <li><a href="#finops">\u{1F4B0} FinOps / Custos</a></li>
    <li><a href="#modernizacao">\u{1F680} Modernização e Redes</a></li>
    <li><a href="#observabilidade">\u{1F50D} Observabilidade e SRE</a></li>
    <li><a href="#relacionamento">\u{1F91D} Relacionamento</a></li>
    <li><a href="#profissionais">\u{1F465} Profissionais</a></li>
  </ul>
</nav>

<main class="main-content">
  <header class="page-header">
    <h1>Resumo Gerencial - Cloud Management Services</h1>
    <p class="subtitle">Período: ${periodo || dataGeracao} — Visão consolidada da operação, esforços estratégicos e destaques do período.</p>
  </header>

  <!-- Sumário Executivo -->
  <section id="sumario" class="section">
    <h2>\u{1F4CB} Sumário Executivo</h2>
    <div class="kpi-row">
      ${pilares.map((p, i) => `<div class="kpi-card" style="border-top: 3px solid ${['#3b82f6','#10b981','#f59e0b','#8b5cf6'][i]}">
        <div class="kpi-value">${p.percentual}%</div>
        <div class="kpi-label">${p.nome}</div>
      </div>`).join('\n      ')}
    </div>
    <div class="card">
      <h3>\u{1F3AF} Foco Estratégico do Período</h3>
      <p>${sumarioExecutivo?.texto || ''}</p>
      <p>${sumarioExecutivo?.focoEstrategico || ''}</p>
    </div>
  </section>

  <!-- Distribuição do Esforço -->
  <section id="esforco" class="section">
    <h2>\u{1F4CA} Distribuição do Esforço Operacional</h2>
    <div class="charts-row">
      <div class="card chart-card">
        <h3>Distribuição por Pilar (%)</h3>
        <canvas id="chartPilares"></canvas>
      </div>
      <div class="card chart-card">
        <h3>Comparativo de Esforço</h3>
        <canvas id="chartComparativo"></canvas>
      </div>
    </div>
    <div class="card">
      <h3>\u{1F4DD} Detalhamento</h3>
      <div class="esforco-list">
        ${pilares.map((p, i) => `<div class="esforco-item">
          <div class="esforco-dot" style="background: ${['#3b82f6','#10b981','#f59e0b','#8b5cf6'][i]}"></div>
          <div><strong>${p.nome} (${p.percentual}%)</strong><p>${p.descricao}</p></div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <!-- Segurança e Governança -->
  <section id="seguranca" class="section">
    <h2>\u{1F6E1} Segurança e Governança</h2>
    <div class="card">
      <h3>Destaques por Cliente</h3>
      <div class="items-list">
        ${(seguranca || []).map(item => `<div class="item-entry">
          <div class="item-icon">\u{1F512}</div>
          <div class="item-body">
            <strong>${item.cliente} — ${item.titulo}</strong>
            <p>${item.descricao}</p>
          </div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <!-- FinOps -->
  <section id="finops" class="section">
    <h2>\u{1F4B0} Otimização de Custos (FinOps)</h2>
    <div class="card">
      <h3>Destaques por Cliente</h3>
      <div class="items-list">
        ${(finops || []).map(item => `<div class="item-entry">
          <div class="item-icon">\u{1F4C9}</div>
          <div class="item-body">
            <strong>${item.cliente} — ${item.titulo}</strong>
            <p>${item.descricao}</p>
          </div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <!-- Modernização e Redes -->
  <section id="modernizacao" class="section">
    <h2>\u{1F680} Modernização e Redes</h2>
    <div class="card">
      <h3>Destaques por Cliente</h3>
      <div class="items-list">
        ${(modernizacao || []).map(item => `<div class="item-entry">
          <div class="item-icon">\u{2601}</div>
          <div class="item-body">
            <strong>${item.cliente} — ${item.titulo}</strong>
            <p>${item.descricao}</p>
          </div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <!-- Observabilidade -->
  <section id="observabilidade" class="section">
    <h2>\u{1F50D} Observabilidade, Performance e Resiliência</h2>
    <div class="card">
      <h3>Destaques por Cliente</h3>
      <div class="items-list">
        ${(observabilidade || []).map(item => `<div class="item-entry">
          <div class="item-icon">\u{1F4C8}</div>
          <div class="item-body">
            <strong>${item.cliente} — ${item.titulo}</strong>
            <p>${item.descricao}</p>
          </div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <!-- Relacionamento -->
  <section id="relacionamento" class="section">
    <h2>\u{1F91D} Destaques Operacionais e Relacionamento</h2>
    <div class="card">
      <h3>Status dos Clientes</h3>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Cliente</th><th>Status</th><th>Destaque</th></tr></thead>
          <tbody>
            ${(relacionamento || []).map(item => {
              const statusClass = item.status === 'Crítico' ? 'status-critico' : item.status === 'Em evolução' ? 'status-evolucao' : 'status-positivo';
              return `<tr><td><strong>${item.cliente}</strong></td><td><span class="badge ${statusClass}">${item.status}</span></td><td>${item.destaque}</td></tr>`;
            }).join('\n            ')}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Profissionais -->
  <section id="profissionais" class="section">
    <h2>\u{1F465} Destaque dos Profissionais</h2>
    <div class="profissionais-grid">
      ${(profissionais || []).map(p => `<div class="prof-card">
        <div class="prof-avatar">${p.iniciais || p.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
        <div class="prof-info">
          <strong>${p.nome}</strong>
          <p>${p.descricao}</p>
        </div>
      </div>`).join('\n      ')}
    </div>
  </section>
</main>

<script>
  const pilarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  new Chart(document.getElementById('chartPilares'), {
    type: 'doughnut',
    data: {
      labels: ${pilarLabels},
      datasets: [{ data: ${pilarValues}, backgroundColor: pilarColors, borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });

  new Chart(document.getElementById('chartComparativo'), {
    type: 'bar',
    data: {
      labels: ${pilarLabels},
      datasets: [{ data: ${pilarValues}, backgroundColor: pilarColors, borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } } }
  });

  // Scroll spy para nav ativa
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
    navLinks.forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === '#' + current) a.classList.add('active');
    });
  });
</script>
</body>
</html>`;

  return html;
}

const CSS_CONTENT = `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  line-height: 1.6;
}

.sidebar {
  position: fixed;
  top: 0; left: 0;
  width: 260px; height: 100vh;
  background: #1e293b;
  color: #e2e8f0;
  padding: 24px 0;
  overflow-y: auto;
  z-index: 100;
}

.sidebar-header {
  padding: 0 20px 24px;
  border-bottom: 1px solid #334155;
  margin-bottom: 16px;
}

.logo-box {
  width: 48px; height: 48px;
  background: #f26522;
  border-radius: 8px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  margin-bottom: 8px;
}

.logo-box span {
  font-family: 'Arial Black', Arial, sans-serif;
  font-size: 9px; font-weight: 900;
  color: white; line-height: 1.2;
}

.logo-text {
  font-size: 0.75rem; color: #94a3b8;
}

.nav-links {
  list-style: none; padding: 0;
}

.nav-links li a {
  display: block;
  padding: 10px 20px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.85rem;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.nav-links li a:hover, .nav-links li a.active {
  background: #334155;
  color: #f8fafc;
  border-left-color: #f26522;
}

.main-content {
  margin-left: 260px;
  padding: 32px 48px;
  max-width: 1100px;
}

.page-header {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.page-header h1 {
  font-size: 1.6rem; color: #1e293b;
}

.page-header .subtitle {
  font-size: 0.9rem; color: #64748b; margin-top: 4px;
}

.section {
  margin-bottom: 48px;
  scroll-margin-top: 24px;
}

.section h2 {
  font-size: 1.25rem; color: #1e293b;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 20px;
}

.card h3 {
  font-size: 0.95rem; color: #475569;
  margin-bottom: 16px;
}

.card p {
  color: #64748b; font-size: 0.9rem;
  margin-bottom: 8px;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.kpi-value {
  font-size: 2rem; font-weight: 700; color: #1e293b;
}

.kpi-label {
  font-size: 0.75rem; color: #64748b; margin-top: 4px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card canvas {
  max-height: 280px;
}

.esforco-list {
  display: flex; flex-direction: column; gap: 16px;
}

.esforco-item {
  display: flex; align-items: flex-start; gap: 12px;
}

.esforco-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  margin-top: 6px; flex-shrink: 0;
}

.esforco-item strong {
  color: #1e293b; font-size: 0.9rem;
}

.esforco-item p {
  margin: 4px 0 0; font-size: 0.85rem;
}

.items-list {
  display: flex; flex-direction: column; gap: 20px;
}

.item-entry {
  display: flex; gap: 14px; align-items: flex-start;
}

.item-icon {
  font-size: 1.3rem; flex-shrink: 0; margin-top: 2px;
}

.item-body strong {
  color: #1e293b; font-size: 0.9rem;
  display: block; margin-bottom: 4px;
}

.item-body p {
  font-size: 0.85rem; color: #64748b; margin: 0;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%; border-collapse: collapse;
  font-size: 0.85rem;
}

th, td {
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

th {
  background: #f8fafc; color: #475569;
  font-weight: 600; font-size: 0.8rem;
  text-transform: uppercase;
}

.badge {
  padding: 4px 10px; border-radius: 12px;
  font-size: 0.75rem; font-weight: 600;
}

.status-positivo { background: #dcfce7; color: #166534; }
.status-evolucao { background: #fef3c7; color: #92400e; }
.status-critico { background: #fecaca; color: #991b1b; }

.profissionais-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.prof-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  display: flex; gap: 14px;
  align-items: flex-start;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.prof-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: #f26522;
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.85rem;
  flex-shrink: 0;
}

.prof-info strong {
  color: #1e293b; font-size: 0.9rem;
  display: block; margin-bottom: 4px;
}

.prof-info p {
  font-size: 0.82rem; color: #64748b; margin: 0;
}

@media print {
  .sidebar { display: none; }
  .main-content { margin-left: 0; padding: 16px; }
  .card { box-shadow: none; border: 1px solid #e2e8f0; }
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; padding: 16px; }
  .charts-row { grid-template-columns: 1fr; }
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .profissionais-grid { grid-template-columns: 1fr; }
}
`;
