/**
 * Gera o HTML do dashboard autocontido com Chart.js
 */

export function gerarDashboardHTML(metricas, data) {
  const {
    periodo,
    totalAtividades,
    totalHoras,
    horasPorCliente,
    horasPorProfissional,
    atividadesPorStatus,
    distribuicaoEsforco,
    topClientes,
  } = metricas;

  // Preparar dados para os gráficos
  const clientesLabels = JSON.stringify(Object.keys(horasPorCliente));
  const clientesData = JSON.stringify(Object.values(horasPorCliente));

  const profissionaisLabels = JSON.stringify(Object.keys(horasPorProfissional));
  const profissionaisData = JSON.stringify(Object.values(horasPorProfissional));

  const statusLabels = JSON.stringify(Object.keys(atividadesPorStatus));
  const statusData = JSON.stringify(Object.values(atividadesPorStatus));

  const pilaresLabels = JSON.stringify(Object.keys(distribuicaoEsforco));
  const pilaresData = JSON.stringify(Object.values(distribuicaoEsforco));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Semanal - Cloud Management Services</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      color: #1a1a2e;
      padding: 24px;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
    }

    .header h1 {
      font-size: 1.8rem;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .header .subtitle {
      color: #6b7280;
      font-size: 0.95rem;
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      text-align: center;
    }

    .kpi-card .value {
      font-size: 2rem;
      font-weight: 700;
      color: #2563eb;
    }

    .kpi-card .label {
      font-size: 0.85rem;
      color: #6b7280;
      margin-top: 4px;
    }

    .kpi-card.green .value { color: #059669; }
    .kpi-card.purple .value { color: #7c3aed; }
    .kpi-card.orange .value { color: #d97706; }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .chart-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .chart-card h3 {
      font-size: 1rem;
      color: #374151;
      margin-bottom: 16px;
    }

    .chart-container {
      position: relative;
      width: 100%;
      max-height: 320px;
    }

    .top-clientes {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-bottom: 24px;
    }

    .top-clientes h3 {
      font-size: 1rem;
      color: #374151;
      margin-bottom: 12px;
    }

    .top-clientes ol {
      padding-left: 20px;
    }

    .top-clientes li {
      padding: 6px 0;
      font-size: 0.9rem;
      color: #4b5563;
    }

    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 0.8rem;
      padding-top: 16px;
    }

    @media print {
      body { background: white; padding: 12px; }
      .chart-card, .kpi-card, .top-clientes { box-shadow: none; border: 1px solid #e5e7eb; }
    }

    @media (max-width: 768px) {
      .charts-grid { grid-template-columns: 1fr; }
      .kpis { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Resumo Gerencial - Cloud Management Services</h1>
    <p class="subtitle">Período: ${periodo} | Gerado em: ${data}</p>
  </div>

  <div class="kpis">
    <div class="kpi-card">
      <div class="value">${totalAtividades}</div>
      <div class="label">Atividades Realizadas</div>
    </div>
    <div class="kpi-card green">
      <div class="value">${totalHoras}h</div>
      <div class="label">Horas Trabalhadas</div>
    </div>
    <div class="kpi-card purple">
      <div class="value">${Object.keys(horasPorCliente).length}</div>
      <div class="label">Clientes Atendidos</div>
    </div>
    <div class="kpi-card orange">
      <div class="value">${Object.keys(horasPorProfissional).length}</div>
      <div class="label">Profissionais Atuantes</div>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-card">
      <h3>🏢 Horas por Cliente</h3>
      <div class="chart-container">
        <canvas id="chartClientes"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <h3>🎯 Distribuição de Esforço por Pilar</h3>
      <div class="chart-container">
        <canvas id="chartPilares"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <h3>👤 Horas por Profissional</h3>
      <div class="chart-container">
        <canvas id="chartProfissionais"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <h3>📋 Atividades por Status</h3>
      <div class="chart-container">
        <canvas id="chartStatus"></canvas>
      </div>
    </div>
  </div>

  <div class="top-clientes">
    <h3>🏆 Top Clientes (por volume de horas)</h3>
    <ol>
      ${(topClientes || []).map(c => `<li><strong>${c}</strong></li>`).join('\n      ')}
    </ol>
  </div>

  <div class="footer">
    Relatório gerado automaticamente via relatorio-semanal | ${data}
  </div>

  <script>
    const cores = [
      '#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626',
      '#0891b2', '#4f46e5', '#ca8a04', '#16a34a', '#9333ea',
      '#e11d48', '#0d9488', '#6366f1', '#ea580c', '#84cc16'
    ];

    // Horas por Cliente - Bar horizontal
    new Chart(document.getElementById('chartClientes'), {
      type: 'bar',
      data: {
        labels: ${clientesLabels},
        datasets: [{
          data: ${clientesData},
          backgroundColor: cores.slice(0, ${Object.keys(horasPorCliente).length}),
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Horas' } }
        }
      }
    });

    // Distribuição por Pilar - Doughnut
    new Chart(document.getElementById('chartPilares'), {
      type: 'doughnut',
      data: {
        labels: ${pilaresLabels},
        datasets: [{
          data: ${pilaresData},
          backgroundColor: ['#2563eb', '#059669', '#d97706', '#7c3aed'],
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } }
        }
      }
    });

    // Horas por Profissional - Bar
    new Chart(document.getElementById('chartProfissionais'), {
      type: 'bar',
      data: {
        labels: ${profissionaisLabels},
        datasets: [{
          data: ${profissionaisData},
          backgroundColor: cores.slice(0, ${Object.keys(horasPorProfissional).length}),
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { title: { display: true, text: 'Horas' } }
        }
      }
    });

    // Atividades por Status - Pie
    new Chart(document.getElementById('chartStatus'), {
      type: 'pie',
      data: {
        labels: ${statusLabels},
        datasets: [{
          data: ${statusData},
          backgroundColor: cores.slice(0, ${Object.keys(atividadesPorStatus).length}),
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } }
        }
      }
    });
  </script>
</body>
</html>`;
}
