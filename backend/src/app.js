const express = require('express');
const cors = require('cors');
const analysisRoutes = require('./routes/analysisRoutes');

require('./config/database');

const app = express();

app.use(cors());
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

app.use((err, _req, res, _next) => {
  console.error('[API] Unhandled:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor.',
  });
});

module.exports = app;
