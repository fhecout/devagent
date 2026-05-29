# DevAgent Lite

Ferramenta full stack com **IA local (Ollama)** que analisa repositórios públicos do GitHub e gera um relatório técnico estruturado — stack, arquitetura, pontos fortes, melhorias, riscos, sugestões de commits, README e post para LinkedIn.

## Funcionalidades

- Colar URL de repositório GitHub público e analisar com um clique
- Clone raso via `simple-git` (pasta temporária removida após análise)
- Scanner inteligente: ignora `node_modules`, builds, binários e arquivos > 200 KB
- Resumo estruturado enviado ao Ollama (não manda o repo inteiro)
- Relatório em português com nota técnica 0–10
- Histórico persistido em SQLite
- Interface React responsiva com Tailwind CSS

## Stack

| Camada    | Tecnologia        |
|-----------|-------------------|
| Frontend  | React + Vite + Tailwind |
| Backend   | Node.js + Express |
| Banco     | SQLite            |
| IA        | Ollama (local)    |
| GitHub    | simple-git        |

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/) no PATH (para clone)
- [Ollama](https://ollama.com/) instalado e em execução

## Instalar Ollama e modelo

1. Baixe e instale: https://ollama.com/download  
2. Inicie o serviço (geralmente sobe automaticamente) ou rode:

```bash
ollama serve
```

3. Baixe o modelo padrão:

```bash
ollama pull llama3.1
```

Outros modelos podem ser usados via variável `OLLAMA_MODEL`.

## Como rodar

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API em `http://localhost:3002`

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App em `http://localhost:5173`

### Scripts

**Backend:** `npm run dev` · `npm start`  
**Frontend:** `npm run dev` · `npm run build`

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3002` | Porta da API |
| `OLLAMA_URL` | `http://localhost:11434` | URL do Ollama |
| `OLLAMA_MODEL` | `llama3.1` | Modelo para geração |
| `MAX_FILE_SIZE_KB` | `200` | Tamanho máximo por arquivo |
| `MAX_FILES_TO_ANALYZE` | `80` | Máximo de arquivos no contexto |
| `TEMP_DIR` | `./temp_repos` | Pasta temporária de clones |

### Frontend (`frontend/.env`)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_API_URL` | *(vazio)* | URL da API; vazio usa proxy do Vite |

Com proxy do Vite, deixe `VITE_API_URL` vazio em desenvolvimento.

## Exemplo de uso

1. Abra `http://localhost:5173`
2. Cole: `https://github.com/facebook/react`
3. Clique em **Analisar repositório**
4. Aguarde o relatório e consulte o histórico na lateral

### API

```bash
curl -X POST http://localhost:3002/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\":\"https://github.com/usuario/repo\"}"
```

```bash
curl http://localhost:3002/api/analyses
curl http://localhost:3002/api/analyses/1
curl http://localhost:3002/api/health
```

## Estrutura do projeto

```
devagent-lite/
├── backend/          # Express + SQLite + Ollama
├── frontend/         # React + Vite + Tailwind
└── README.md
```

## Roadmap

- [ ] Suporte a branch/tag na URL
- [ ] Análise incremental (cache por commit)
- [ ] Exportar relatório em PDF/Markdown
- [ ] Comparação entre duas análises do mesmo repo
- [ ] Fila de jobs para repositórios grandes
- [ ] Autenticação opcional para repos privados (token GitHub)

## Licença

MIT — uso livre para estudos e projetos pessoais.
