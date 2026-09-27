/**
 * POLAR-EMS AI Assistant Routes
 */

const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistant.controller');

// POST /api/ai/assistant
router.post('/', (req, res, next) => assistantController.ask(req, res, next));

module.exports = router;
