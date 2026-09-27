/**
 * AI Tools API Routes
 */

const express = require('express');
const router = express.Router();
const aiToolsController = require('../controllers/ai-tools.controller');

// Discovery endpoint
router.get('/', (req, res, next) => aiToolsController.listTools(req, res, next));

// Safe execution endpoint
router.post('/execute', (req, res, next) => aiToolsController.execute(req, res, next));

module.exports = router;
