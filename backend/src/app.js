const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const analysisRoutes = require('./routes/analysisRoutes');

require('./config/database');

const app = express();

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não permitida pelo CORS.'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'DevAgent Lite API',
    version: '1.0.0',
    endpoints: {
      analyze: 'POST /api/analyze',
      analyses: 'GET /api/analyses',
      analysis: 'GET /api/analyses/:id',
      health: 'GET /api/health',
    },
  });
});

app.use('/api', analysisRoutes);

app.use((err, _req, res, next) => {
  if (err.message === 'Origem não permitida pelo CORS.') {
    return res.status(403).json({
      success: false,
      error: 'Origem não permitida.',
    });
  }
  return next(err);
});

app.use((err, _req, res, _next) => {
  console.error('[API] Unhandled:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor.',
  });
});

module.exports = app;
