const express = require('express');
const { z } = require('zod');
const ingestController = require('../controllers/ingest.controller');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

const stationParam = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

// Real-time single record injection
router.post('/:stationId/telemetry', validate(stationParam), ingestController.ingestTelemetry);

// Bulk time-series upload (CSV/JSON rows)
router.post('/:stationId/batch', validate(stationParam), ingestController.ingestBatch);

// Database status & record counts
router.get('/status', ingestController.getStatus);

// Purge station telemetry
router.post('/purge', ingestController.purgeTelemetry);

// Template format specification
router.get('/template/:type', ingestController.getTemplate);

module.exports = router;
