/**
 * Solar Generation History Controller
 * 
 * Endpoints for querying the modeled historical PV generation time series.
 */

const solarGenHistoryService = require('../services/solar-generation-history.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/solar-generation-history/:stationId
 * Retrieves paginated historical modeled solar generation records.
 */
const getHistory = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const { start, end, limit, page } = req.query;

  const result = await solarGenHistoryService.getHistoricalSolarSeries(stationId, {
    start,
    end,
    limit,
    page,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/solar-generation-history/:stationId/summary
 * Retrieves summary statistics for the historical modeled solar generation series.
 */
const getSummary = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const { start, end } = req.query;

  const summary = await solarGenHistoryService.getHistoricalSolarSummary(stationId, {
    start,
    end,
  });

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * POST /api/solar-generation-history/:stationId/generate
 * Triggers historical solar generation generation pipeline for a station.
 */
const generateHistory = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const { datasetPath, dryRun } = req.body;

  const result = await solarGenHistoryService.generateHistoricalSolarSeries({
    stationId,
    datasetPath,
    dryRun: Boolean(dryRun),
  });

  res.status(200).json({
    success: true,
    message: 'Historical solar generation series computed successfully.',
    data: result,
  });
});

module.exports = {
  getHistory,
  getSummary,
  generateHistory,
};
