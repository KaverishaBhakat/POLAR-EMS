/**
 * Solar Resource Climatology Controller
 * 
 * Handles HTTP requests for historical solar radiation climatology endpoints.
 * Validates request parameters and delegates to solarResourceService.
 */

const solarResourceService = require('../services/solar-resource.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/solar-resource
 * Returns dataset summary metadata and coverage bounds.
 */
const getMetadata = asyncHandler(async (req, res) => {
  const metadata = await solarResourceService.getClimatologyMetadata();
  res.status(200).json({
    success: true,
    data: metadata,
  });
});

/**
 * GET /api/solar-resource/:year/:month/:hour
 * Returns a specific historical climatology record by year, month, and hour.
 */
const getClimatologyPoint = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);
  const hour = parseInt(req.params.hour, 10);

  if (isNaN(year)) {
    throw ApiError.badRequest('Year parameter must be a valid integer', 'INVALID_PARAMETER');
  }
  if (isNaN(month) || month < 1 || month > 12) {
    throw ApiError.badRequest('Month parameter must be an integer between 1 and 12', 'INVALID_PARAMETER');
  }
  if (isNaN(hour) || hour < 1 || hour > 24) {
    throw ApiError.badRequest('Hour parameter must be an integer between 1 and 24', 'INVALID_PARAMETER');
  }

  const data = await solarResourceService.getClimatologyByPoint(year, month, hour);
  res.status(200).json({
    success: true,
    data,
  });
});

/**
 * GET /api/solar-resource/profile?month=12&hour=13
 * Returns climatology values across all available years for the specified month and/or hour.
 */
const getProfile = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.month !== undefined) {
    const month = parseInt(req.query.month, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      throw ApiError.badRequest('Query parameter "month" must be an integer between 1 and 12', 'INVALID_PARAMETER');
    }
    query.month = month;
  }

  if (req.query.hour !== undefined) {
    const hour = parseInt(req.query.hour, 10);
    if (isNaN(hour) || hour < 1 || hour > 24) {
      throw ApiError.badRequest('Query parameter "hour" must be an integer between 1 and 24', 'INVALID_PARAMETER');
    }
    query.hour = hour;
  }

  const data = await solarResourceService.getClimatologyProfile(query);
  res.status(200).json({
    success: true,
    data,
  });
});

/**
 * GET /api/solar-resource/month/:month
 * Returns the 24-hour diurnal climatological solar resource profile for a calendar month.
 */
const getMonthProfile = asyncHandler(async (req, res) => {
  const month = parseInt(req.params.month, 10);

  if (isNaN(month) || month < 1 || month > 12) {
    throw ApiError.badRequest('Month parameter must be an integer between 1 and 12', 'INVALID_PARAMETER');
  }

  const data = await solarResourceService.getMonthClimatologyProfile(month);
  res.status(200).json({
    success: true,
    data,
  });
});

/**
 * GET /api/solar-resource/year/:year
 * Returns all monthly/hourly climatology records for a calendar year (sorted by month ASC, hour ASC).
 */
const getYearData = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year, 10);

  if (isNaN(year)) {
    throw ApiError.badRequest('Year parameter must be a valid integer', 'INVALID_PARAMETER');
  }

  const data = await solarResourceService.getYearClimatology(year);
  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getMetadata,
  getClimatologyPoint,
  getProfile,
  getMonthProfile,
  getYearData,
};
