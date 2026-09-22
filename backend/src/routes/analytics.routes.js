const express = require('express');
const { z } = require('zod');
const analyticsController = require('../controllers/analytics.controller');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

const analyticsQuery = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
  query: z.object({
    range: z.string().optional().default('7d'),
    days: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  }),
};

router.get('/:stationId', validate(analyticsQuery), analyticsController.getHistoricalAnalytics);
router.get('/:stationId/historical', validate(analyticsQuery), analyticsController.getHistoricalAnalytics);
router.get('/:stationId/overview', validate(analyticsQuery), analyticsController.getHistoricalAnalytics);
router.get('/:stationId/energy', validate(analyticsQuery), analyticsController.getEnergyAnalytics);
router.get('/:stationId/fuel', validate(analyticsQuery), analyticsController.getFuelAnalytics);
router.get('/:stationId/renewable', validate(analyticsQuery), analyticsController.getRenewableAnalytics);
router.get('/:stationId/generator', validate(analyticsQuery), analyticsController.getGeneratorAnalytics);
router.get('/:stationId/battery', validate(analyticsQuery), analyticsController.getBatteryAnalytics);

module.exports = router;

