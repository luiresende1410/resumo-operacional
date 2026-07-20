/**
 * Template para gerar o Resumo Gerencial do Time.
 * Foco: atividades principais por cliente/pilar, volume, horas, destaques pessoais.
 * Visual executivo para apresentação à diretoria.
 */

export const RESUMO_TIME_SYSTEM_PROMPT = `Você é um Diretor de Operações de Cloud preparando um resumo executivo semanal para a diretoria. Sua tarefa é transformar dados brutos de atividades em um resumo focado no DESEMPENHO DO TIME.

IMPORTANTE: Responda APENAS com JSON válido. Sem markdown, sem texto adicional.

### DIRETRIZES:
1. Foco no TIME: quem fez o quê, quanto produziu, onde se destacou.
2. Tom executivo e direto — dados objetivos, sem enrolação.
3. Agrupe atividades por cliente E por pilar estratégico.
4. Destaque volume (quantidade de demandas) e esforço (horas).
5. Reconheça profissionais com base em dados reais (horas, variedade, criticidade).
6. Mantenha nomes de clientes em CAIXA ALTA.

### ESTRUTURA DO JSON:
{
  "periodo": "DD/MM a DD/MM",
  "resumoExecutivo": "Parágrafo de 2-3 linhas com visão geral da semana do time: volume total, foco principal, resultado.",
  "kpis": {
    "totalAtividades": 0,
    "totalHoras": 0,
    "totalClientes": 0,
    "totalProfissionais": 0,
    "mediaHorasPorProfissional": 0
  },
  "atividadesPorCliente": [
    { "cliente": "NOME", "atividades": 0, "horas": 0, "principaisEntregas": ["Entrega 1", "Entrega 2"] }
  ],
  "atividadesPorPilar": [
    { "pilar": "Segurança e Governança", "percentual": 0, "atividades": 0, "horas": 0, "destaques": ["Destaque 1"] },
    { "pilar": "Infraestrutura / DevOps", "percentual": 0, "atividades": 0, "horas": 0, "destaques": ["Destaque 1"] },
    { "pilar": "Sustentação e Incidentes", "percentual": 0, "atividades": 0, "horas": 0, "destaques": ["Destaque 1"] },
    { "pilar": "FinOps / Otimização de Custos", "percentual": 0, "atividades": 0, "horas": 0, "destaques": ["Destaque 1"] }
  ],
  "topAtividades": [
    { "titulo": "Título resumido da atividade", "cliente": "NOME", "profissional": "Nome", "horas": 0, "impacto": "Breve descrição do impacto" }
  ],
  "destaquesProfissionais": [
    { "nome": "Nome Completo", "iniciais": "NC", "horas": 0, "atividades": 0, "clientes": ["CLIENTE1"], "destaque": "Frase de reconhecimento baseada nos dados." }
  ],
  "volumePorStatus": { "Concluído": 0, "Em andamento": 0 }
}

Gere de 5 a 10 itens em topAtividades (as mais relevantes/críticas).
Ordene atividadesPorCliente por horas decrescente.
Os percentuais em atividadesPorPilar devem somar 100%.
Um item por profissional em destaquesProfissionais.
RESPONDA APENAS COM O JSON.`;


export function buildResumoTimeUserPrompt(csvContent, observacoes = '') {
  let prompt = `Dados de atividades da semana do time (CSV):\n\n${csvContent}`;
  if (observacoes) {
    prompt += `\n\nObservações do gestor:\n${observacoes}`;
  }
  prompt += `\n\nGere o JSON estruturado conforme instruído.`;
  return prompt;
}

export function gerarResumoTimeHTML(data, dataGeracao) {
  const {
    periodo, resumoExecutivo, kpis,
    atividadesPorCliente, atividadesPorPilar,
    topAtividades, destaquesProfissionais, volumePorStatus,
  } = data;

  const pilarLabels = JSON.stringify((atividadesPorPilar || []).map(p => p.pilar));
  const pilarValues = JSON.stringify((atividadesPorPilar || []).map(p => p.percentual));
  const pilarHoras = JSON.stringify((atividadesPorPilar || []).map(p => p.horas));

  const clienteLabels = JSON.stringify((atividadesPorCliente || []).map(c => c.cliente));
  const clienteHoras = JSON.stringify((atividadesPorCliente || []).map(c => c.horas));
  const clienteAtividades = JSON.stringify((atividadesPorCliente || []).map(c => c.atividades));

  const statusLabels = JSON.stringify(Object.keys(volumePorStatus || {}));
  const statusValues = JSON.stringify(Object.values(volumePorStatus || {}));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resumo Gerencial do Time - Cloud Management Services</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<style>
${RESUMO_TIME_CSS}
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <header class="report-header">
    <div class="header-left">
      <div class="logo-mark"><span>CLOUD</span><span>DOG</span></div>
      <div class="header-text">
        <h1>Resumo Gerencial do Time</h1>
        <p class="header-subtitle">Cloud Management Services — ${periodo || dataGeracao}</p>
      </div>
    </div>
    <div class="header-badge">Relatório Semanal</div>
  </header>

  <!-- Resumo Executivo -->
  <section class="section">
    <p class="resumo-exec">${resumoExecutivo || ''}</p>
  </section>

  <!-- KPIs -->
  <section class="section">
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-number">${kpis?.totalAtividades || 0}</div><div class="kpi-label">Atividades</div></div>
      <div class="kpi"><div class="kpi-number">${kpis?.totalHoras || 0}h</div><div class="kpi-label">Horas Trabalhadas</div></div>
      <div class="kpi"><div class="kpi-number">${kpis?.totalClientes || 0}</div><div class="kpi-label">Clientes Atendidos</div></div>
      <div class="kpi"><div class="kpi-number">${kpis?.totalProfissionais || 0}</div><div class="kpi-label">Profissionais</div></div>
      <div class="kpi"><div class="kpi-number">${kpis?.mediaHorasPorProfissional || 0}h</div><div class="kpi-label">Média por Profissional</div></div>
    </div>
  </section>

  <!-- Gráficos -->
  <section class="section">
    <h2>Distribuição do Esforço</h2>
    <div class="charts-grid">
      <div class="chart-box">
        <h3>Por Pilar Estratégico</h3>
        <canvas id="chartPilares"></canvas>
      </div>
      <div class="chart-box">
        <h3>Horas por Cliente</h3>
        <canvas id="chartClientes"></canvas>
      </div>
    </div>
  </section>

  <!-- Atividades por Pilar -->
  <section class="section">
    <h2>Esforço por Pilar</h2>
    <div class="pilar-cards">
      ${(atividadesPorPilar || []).map((p, i) => `<div class="pilar-card">
        <div class="pilar-header" style="border-left: 4px solid ${['#2563eb','#059669','#d97706','#7c3aed'][i]}">
          <div class="pilar-title">${p.pilar}</div>
          <div class="pilar-stats">${p.atividades} atividades · ${p.horas}h · ${p.percentual}%</div>
        </div>
        <ul class="pilar-destaques">${(p.destaques || []).map(d => `<li>${d}</li>`).join('')}</ul>
      </div>`).join('\n      ')}
    </div>
  </section>

  <!-- Top Atividades -->
  <section class="section">
    <h2>Principais Entregas da Semana</h2>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>#</th><th>Atividade</th><th>Cliente</th><th>Profissional</th><th>Horas</th><th>Impacto</th></tr></thead>
        <tbody>
          ${(topAtividades || []).map((a, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${a.titulo}</strong></td>
            <td>${a.cliente}</td>
            <td>${a.profissional}</td>
            <td>${a.horas}h</td>
            <td>${a.impacto}</td>
          </tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Volume por Cliente -->
  <section class="section">
    <h2>Volume por Cliente</h2>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Cliente</th><th>Atividades</th><th>Horas</th><th>Principais Entregas</th></tr></thead>
        <tbody>
          ${(atividadesPorCliente || []).map(c => `<tr>
            <td><strong>${c.cliente}</strong></td>
            <td>${c.atividades}</td>
            <td>${c.horas}h</td>
            <td>${(c.principaisEntregas || []).join('; ')}</td>
          </tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Destaques Profissionais -->
  <section class="section">
    <h2>Destaques do Time</h2>
    <div class="prof-grid">
      ${(destaquesProfissionais || []).map(p => `<div class="prof-card">
        <div class="prof-avatar">${p.iniciais || p.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
        <div class="prof-body">
          <div class="prof-name">${p.nome}</div>
          <div class="prof-metrics">${p.atividades} atividades · ${p.horas}h · ${(p.clientes || []).length} cliente(s)</div>
          <div class="prof-destaque">${p.destaque}</div>
        </div>
      </div>`).join('\n      ')}
    </div>
  </section>

  <!-- Footer -->
  <footer class="report-footer">
    <div class="footer-logo"><span>CLOUD</span><span>DOG</span></div>
    <span>Gerado automaticamente em ${dataGeracao} — Cloud Management Services</span>
  </footer>
</div>

<script>
  const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04'];

  new Chart(document.getElementById('chartPilares'), {
    type: 'doughnut',
    data: {
      labels: ${pilarLabels},
      datasets: [{ data: ${pilarValues}, backgroundColor: colors.slice(0, 4), borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 16 } } } }
  });

  new Chart(document.getElementById('chartClientes'), {
    type: 'bar',
    data: {
      labels: ${clienteLabels},
      datasets: [{ label: 'Horas', data: ${clienteHoras}, backgroundColor: '#2563eb', borderRadius: 4 }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, title: { display: true, text: 'Horas' } } } }
  });
</script>
</body>
</html>`;
}

const RESUMO_TIME_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f1f5f9;
  color: #1e293b;
  line-height: 1.6;
}

.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 48px;
  background: white;
  min-height: 100vh;
  box-shadow: 0 0 40px rgba(0,0,0,0.04);
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 24px;
  margin-bottom: 32px;
  border-bottom: 2px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-mark {
  width: 48px; height: 48px;
  background: #f26522;
  border-radius: 8px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}

.logo-mark span {
  font-family: 'Arial Black', sans-serif;
  font-size: 9px; font-weight: 900;
  color: white; line-height: 1.2;
}

.header-text h1 {
  font-size: 1.4rem; font-weight: 700; color: #0f172a;
}

.header-subtitle {
  font-size: 0.85rem; color: #64748b; margin-top: 2px;
}

.header-badge {
  background: #f0fdf4;
  color: #166534;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #bbf7d0;
}

.section {
  margin-bottom: 40px;
}

.section h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.resumo-exec {
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.7;
  padding: 20px 24px;
  background: #f8fafc;
  border-left: 4px solid #f26522;
  border-radius: 0 8px 8px 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.kpi {
  text-align: center;
  padding: 20px 12px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.kpi-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
}

.kpi-label {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-box {
  background: #f8fafc;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.chart-box h3 {
  font-size: 0.85rem;
  color: #475569;
  margin-bottom: 12px;
  font-weight: 600;
}

.chart-box canvas {
  max-height: 260px;
}

.pilar-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.pilar-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
}

.pilar-header {
  padding-left: 12px;
  margin-bottom: 12px;
}

.pilar-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: #0f172a;
}

.pilar-stats {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
}

.pilar-destaques {
  list-style: none;
  padding: 0;
}

.pilar-destaques li {
  font-size: 0.8rem;
  color: #475569;
  padding: 4px 0;
  border-bottom: 1px solid #f1f5f9;
}

.pilar-destaques li:last-child {
  border-bottom: none;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

th, td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

td strong {
  color: #0f172a;
}

.prof-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.prof-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px 20px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.prof-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #f26522;
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.8rem;
  flex-shrink: 0;
}

.prof-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #0f172a;
}

.prof-metrics {
  font-size: 0.72rem;
  color: #64748b;
  margin: 2px 0 6px;
}

.prof-destaque {
  font-size: 0.8rem;
  color: #475569;
  line-height: 1.5;
}

.report-footer {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: #94a3b8;
}

.footer-logo {
  width: 28px; height: 28px;
  background: #f26522;
  border-radius: 4px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}

.footer-logo span {
  font-family: 'Arial Black', sans-serif;
  font-size: 5px; font-weight: 900;
  color: white; line-height: 1.1;
}

@media print {
  body { background: white; }
  .page { box-shadow: none; padding: 20px; }
}

@media (max-width: 768px) {
  .page { padding: 20px 16px; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .pilar-cards { grid-template-columns: 1fr; }
  .prof-grid { grid-template-columns: 1fr; }
  .report-header { flex-direction: column; align-items: flex-start; gap: 12px; }
}
`;
