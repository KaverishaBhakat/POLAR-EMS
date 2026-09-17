const express = require('express');
const { z } = require('zod');
const dashboardController = require('../controllers/dashboard.controller');
const validate = require('../middleware/validation.middleware');

const router = express.Router();

const stationParam = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

// Consolidated real-time station telemetry dashboard
router.get('/:stationId', validate(stationParam), dashboardController.getDashboardData);

module.exports = router;
