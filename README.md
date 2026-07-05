# 📊 Gerador de Relatório Semanal

Ferramenta CLI que transforma o CSV de atividades exportado do Jira em:
- **Relatório gerencial** (Markdown) — estruturado, consultivo, pronto para apresentar
- **Dashboard HTML** — autocontido, com gráficos interativos (Chart.js), abre em qualquer navegador

## Pré-requisitos

- Node.js 18+
- Chave de API do Google Gemini (gratuita com Google Workspace)

## Instalação

```bash
cd relatorio-semanal
npm install
```

## Configuração

1. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
copy .env.example .env
```

2. Edite o `.env` e insira sua chave da API do Gemini:

```
GEMINI_API_KEY=sua-chave-aqui
```

> Obtenha sua chave em: https://aistudio.google.com/app/apikey

## Uso

### Comando básico

```bash
node gerar-relatorio.js --csv atividades-semana.csv
```

### Com observações adicionais

```bash
node gerar-relatorio.js --csv atividades.csv --obs "Semana com foco em segurança por conta da auditoria"
```

### Opções disponíveis

| Flag | Descrição | Padrão |
|------|-----------|--------|
| `--csv <arquivo>` | Caminho para o CSV do Jira (obrigatório) | — |
| `--obs <texto>` | Observações extras para contextualizar o relatório | — |
| `--output <pasta>` | Pasta onde salvar os arquivos | `output` |
| `--modelo <modelo>` | Modelo do Gemini | `gemini-2.5-flash` |

### Saída

Após a execução, dois arquivos são criados na pasta `output/`:

```
output/
├── relatorio-2026-07-05.md      ← Relatório gerencial completo
└── dashboard-2026-07-05.html    ← Dashboard visual com gráficos
```

## Testar com dados de exemplo

```bash
node gerar-relatorio.js --csv exemplo.csv
```

## Estrutura do CSV esperada

O CSV deve conter estas colunas (padrão de exportação do Jira):

| Coluna | Descrição |
|--------|-----------|
| Data | Data da atividade (DD/MM/YYYY) |
| Cliente | Nome do cliente |
| Resumo | Descrição curta da atividade |
| Nome | Profissional que executou |
| Comentário | Detalhes adicionais |
| Link | Link para o ticket no Jira |
| Status | Status da atividade (Concluído, Em andamento, etc.) |
| Horas | Horas gastas na atividade |

## Personalização

- **Prompt do relatório**: edite `prompt-template.js` para ajustar a estrutura, tom ou seções do relatório
- **Visual do dashboard**: edite `dashboard-template.js` para alterar cores, gráficos ou layout
- **Modelo de IA**: use `--modelo gemini-2.5-pro` para relatórios mais detalhados (porém mais lento)
