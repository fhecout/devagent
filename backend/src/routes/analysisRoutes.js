const express = require('express');
const rateLimit = require('express-rate-limit');
const analysisController = require('../controllers/analysisController');

const router = express.Router();

const analyzeLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_ANALYZE_MAX || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    code: 'RATE_LIMITED',
  },
});

router.get('/health', analysisController.health);
router.post('/analyze', analyzeLimiter, analysisController.analyze);
router.get('/analyses', analysisController.list);
router.get('/analyses/:id', analysisController.getOne);

module.exports = router;
