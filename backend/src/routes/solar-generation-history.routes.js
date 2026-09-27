/**
 * Solar Generation History Routes
 * 
 * Base route: /api/solar-generation-history
 */

const express = require('express');
const { z } = require('zod');
const solarGenHistoryController = require('../controllers/solar-generation-history.controller');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

const stationParamsSchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

const historyQuerySchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
  query: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    limit: z.string().optional(),
    page: z.string().optional(),
  }),
};

// Summary of modeled solar generation for station
router.get(
  '/:stationId/summary',
  validate(stationParamsSchema),
  solarGenHistoryController.getSummary
);

// Paginated historical modeled solar generation records
router.get(
  '/:stationId',
  validate(historyQuerySchema),
  solarGenHistoryController.getHistory
);

// Admin / Manual generation trigger
router.post(
  '/:stationId/generate',
  validate(stationParamsSchema),
  solarGenHistoryController.generateHistory
);

module.exports = router;
