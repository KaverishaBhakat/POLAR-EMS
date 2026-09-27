/**
 * Photovoltaic (PV) Generation Controller
 * 
 * Handles HTTP requests for estimating solar photovoltaic generation
 * from climatological solar resource profiles.
 */

const pvGenerationService = require('../services/pv-generation.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/pv-generation/estimate
 * Returns estimated PV generation power for a specific timestamp and station.
 */
const getEstimate = asyncHandler(async (req, res) => {
  const { stationId, timestamp, year, capacityKw, performanceRatio } = req.query;

  const data = await pvGenerationService.estimatePvGeneration({
    stationId,
    timestamp,
    year: year ? parseInt(year, 10) : undefined,
    capacityKw: capacityKw ? parseFloat(capacityKw) : undefined,
    performanceRatio: performanceRatio ? parseFloat(performanceRatio) : undefined,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

/**
 * GET /api/pv-generation/monthly-profile
 * Returns 24-hour diurnal PV generation curve for a calendar month and station.
 */
const getMonthlyProfile = asyncHandler(async (req, res) => {
  const { stationId, month, year, capacityKw, performanceRatio } = req.query;

  const data = await pvGenerationService.getMonthlyPvProfile({
    stationId,
    month,
    year: year ? parseInt(year, 10) : undefined,
    capacityKw: capacityKw ? parseFloat(capacityKw) : undefined,
    performanceRatio: performanceRatio ? parseFloat(performanceRatio) : undefined,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getEstimate,
  getMonthlyProfile,
};
