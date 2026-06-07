const analysisService = require('../services/analysisService');
const ollamaService = require('../services/ollamaService');

const MAX_REPO_URL_LENGTH = 500;

const SAFE_SERVER_ERRORS = {
  500: 'Erro interno do servidor. Tente novamente mais tarde.',
  502: 'Falha ao processar o repositório. Tente novamente mais tarde.',
  503: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  504: 'A operação demorou demais. Tente novamente com um repositório menor.',
};

async function analyze(req, res) {
  try {
    const { repoUrl } = req.body || {};

    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Campo repoUrl é obrigatório.',
      });
    }

    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl || trimmedUrl.length > MAX_REPO_URL_LENGTH) {
      return res.status(400).json({
        success: false,
        error: 'URL inválida ou muito longa.',
      });
    }

    const result = await analysisService.analyzeRepository(trimmedUrl);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

async function list(req, res) {
  try {
    const parsedLimit = parseInt(req.query.limit || '20', 10);
    const limit = Number.isNaN(parsedLimit) ? 20 : Math.min(parsedLimit, 50);
    const items = await analysisService.getHistory(limit);
    return res.json({ success: true, data: items });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }
    const item = await analysisService.getById(id);
    return res.json({ success: true, data: item });
  } catch (err) {
    return handleError(res, err);
  }
}

async function health(req, res) {
  const ollamaOk = await ollamaService.checkOllamaHealth();
  return res.json({
    success: true,
    data: {
      api: 'ok',
      ollama: ollamaOk,
      model: ollamaService.OLLAMA_MODEL,
    },
  });
}

function handleError(res, err) {
  const status = err.statusCode || 500;
  const payload = { success: false };

  if (status >= 500) {
    console.error('[API]', err);
    payload.error =
      err.clientMessage || SAFE_SERVER_ERRORS[status] || SAFE_SERVER_ERRORS[500];
  } else {
    payload.error = err.message || 'Requisição inválida.';
  }

  if (err.code) payload.code = err.code;
  return res.status(status).json(payload);
}

module.exports = { analyze, list, getOne, health };
