/**
 * RAG Knowledge Retrieval Routes
 */

const express = require('express');
const router = express.Router();
const ragController = require('../controllers/rag.controller');

// Support both POST and GET for search
router.post('/search', (req, res, next) => ragController.search(req, res, next));
router.get('/search', (req, res, next) => ragController.search(req, res, next));

module.exports = router;
