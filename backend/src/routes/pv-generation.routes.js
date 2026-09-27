/**
 * Photovoltaic (PV) Generation Estimation Routes
 * 
 * Base: /api/pv-generation
 * 
 * Exposes solar PV output power estimation derived from climatological irradiance.
 */

const express = require('express');
const router = express.Router();
const pvGenerationController = require('../controllers/pv-generation.controller');

// GET /api/pv-generation/estimate?stationId=<ID>&timestamp=<ISO>
router.get('/estimate', pvGenerationController.getEstimate);

// GET /api/pv-generation/monthly-profile?stationId=<ID>&month=<1-12>
router.get('/monthly-profile', pvGenerationController.getMonthlyProfile);

module.exports = router;
