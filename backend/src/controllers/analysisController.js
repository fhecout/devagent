const analysisService = require('../services/analysisService');
const ollamaService = require('../services/ollamaService');

async function analyze(req, res) {
  try {
    const { repoUrl } = req.body || {};

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Campo repoUrl é obrigatório.',
      });
    }

    const result = await analysisService.analyzeRepository(repoUrl);

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
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
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
  const payload = {
    success: false,
    error: err.message || 'Erro interno do servidor.',
  };
  if (err.code) payload.code = err.code;
  if (status >= 500) {
    console.error('[API]', err);
  }
  return res.status(status).json(payload);
}

module.exports = { analyze, list, getOne, health };
