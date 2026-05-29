const express = require('express');
const analysisController = require('../controllers/analysisController');

const router = express.Router();

router.get('/health', analysisController.health);
router.post('/analyze', analysisController.analyze);
router.get('/analyses', analysisController.list);
router.get('/analyses/:id', analysisController.getOne);

module.exports = router;
