/**
 * Solar Resource Climatology Routes
 * 
 * Base: /api/solar-resource
 * 
 * Endpoints for accessing historical solar radiation climatology baseline datasets.
 */

const express = require('express');
const router = express.Router();
const solarResourceController = require('../controllers/solar-resource.controller');

// 1. GET /api/solar-resource — Dataset metadata and summary statistics
router.get('/', solarResourceController.getMetadata);

// 3. GET /api/solar-resource/profile?month=12&hour=13 — Multi-year values for month/hour
router.get('/profile', solarResourceController.getProfile);

// 4. GET /api/solar-resource/month/:month — 24-hour diurnal climatology profile for month
router.get('/month/:month', solarResourceController.getMonthProfile);

// 5. GET /api/solar-resource/year/:year — All records for a specific year
router.get('/year/:year', solarResourceController.getYearData);

// 2. GET /api/solar-resource/:year/:month/:hour — Specific year/month/hour observation
router.get('/:year/:month/:hour', solarResourceController.getClimatologyPoint);

module.exports = router;
