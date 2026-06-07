const { parseReport } = require('../utils/reportParser');

const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

const JSON_SCHEMA_HINT = `{
  "summary": "string",
  "stack": "string",
  "architecture": "string",
  "strengths": "string",
  "improvements": "string",
  "risks": "string",
  "nextCommits": "string",
  "readmeSuggestions": "string",
  "technicalScore": "string com nota X/10 e justificativa",
  "featureIdeas": "string com ideias de novas funcionalidades",
  "linkedInPost": "string",
  "conclusion": "string"
}`;

const SYSTEM_MESSAGE = `Você é um tech lead sênior. Analise repositórios de software.

REGRAS OBRIGATÓRIAS:
- Responda APENAS em português do Brasil.
- Leia o DOSSIÊ DO PROJETO e o README — eles definem o que o produto faz.
- NUNCA cole código-fonte nem invente nome de pacote que não está em "Nomes válidos".
- NUNCA reduza o projeto a um único arquivo auxiliar (ex.: um tool/*.js) se o README descreve outro propósito.
- NUNCA contradiga "FATOS VERIFICADOS" nem o dossiê.
- summary: 2-4 frases sobre o propósito REAL (igual ao dossiê).
- improvements: melhorias técnicas (qualidade, estrutura, segurança, DX).
- featureIdeas: 4-6 funcionalidades NOVAS alinhadas ao domínio do projeto.
- technicalScore: obrigatório "X/10 — justificativa".
- Use bullet points com "•" nas listas.`;

const BAD_RESPONSE_PATTERNS = [
  /aqui está o código/i,
  /código completo/i,
  /código omitido/i,
  /espero que isso ajude/i,
  /sinta-se à vontade para perguntar/i,
  /filemanager\.js/i,
  /```/,
];

function isLowQualityResponse(raw, sections) {
  if (!raw || raw.length < 80) return true;
  if (BAD_RESPONSE_PATTERNS.some((p) => p.test(raw))) return true;

  const summary = sections?.summary || '';
  if (BAD_RESPONSE_PATTERNS.some((p) => p.test(summary))) return true;
  if (summary.includes('[código omitido')) return true;

  const filled = Object.values(sections || {}).filter((v) => v?.trim?.().length > 40);
  return filled.length < 2;
}

async function checkOllamaHealth() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function callOllamaChat(userContent, strict = false) {
  const extra = strict
    ? '\n\nATENÇÃO: resposta anterior inválida. Retorne SOMENTE JSON válido, sem markdown, sem código.'
    : '';

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        {
          role: 'user',
          content: `${userContent}${extra}\n\nFormato JSON obrigatório:\n${JSON_SCHEMA_HINT}`,
        },
      ],
      options: {
        temperature: strict ? 0.2 : 0.35,
        num_predict: 5000,
      },
    }),
    signal: AbortSignal.timeout(300000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404 && body.includes('model')) {
      const modelErr = new Error(
        `Modelo "${OLLAMA_MODEL}" não encontrado. Execute: ollama pull ${OLLAMA_MODEL}`
      );
      modelErr.statusCode = 503;
      throw modelErr;
    }
    const apiErr = new Error('Erro na comunicação com o serviço de IA.');
    apiErr.statusCode = 502;
    throw apiErr;
  }

  const data = await res.json();
  return (data.message?.content || '').trim();
}

async function generateReport(repoContext) {
  const healthy = await checkOllamaHealth();
  if (!healthy) {
    const err = new Error(
      'Ollama não está acessível. Inicie o Ollama (ollama serve) e confirme o modelo instalado.'
    );
    err.statusCode = 503;
    err.code = 'OLLAMA_UNAVAILABLE';
    throw err;
  }

  let raw;
  try {
    raw = await callOllamaChat(repoContext, false);
  } catch (err) {
    console.error('[Ollama] Falha na requisição:', err.message);
    const networkErr = new Error('Falha ao comunicar com o serviço de IA local.');
    networkErr.statusCode = 503;
    networkErr.code = 'OLLAMA_REQUEST_FAILED';
    throw networkErr;
  }

  let parsed = parseReport(raw);

  if (isLowQualityResponse(raw, parsed.sections)) {
    try {
      const retryRaw = await callOllamaChat(repoContext, true);
      const retryParsed = parseReport(retryRaw);
      if (!isLowQualityResponse(retryRaw, retryParsed.sections)) {
        raw = retryRaw;
        parsed = retryParsed;
        parsed.parseMode = (parsed.parseMode || 'json') + '+retry';
      }
    } catch {
      /* mantém primeira resposta; analysisService usará fallback scanner */
    }
  }

  if (!raw) {
    const emptyErr = new Error('Ollama retornou resposta vazia.');
    emptyErr.statusCode = 502;
    throw emptyErr;
  }

  const valid = !isLowQualityResponse(raw, parsed.sections);

  return {
    model: OLLAMA_MODEL,
    raw,
    sections: parsed.sections,
    technicalScore: parsed.score,
    parseMode: parsed.parseMode,
    aiValid: valid,
  };
}

module.exports = {
  generateReport,
  checkOllamaHealth,
  isLowQualityResponse,
  OLLAMA_MODEL,
  OLLAMA_URL,
};
