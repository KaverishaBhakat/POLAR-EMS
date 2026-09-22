const analyticsService = require('../services/analytics.service');
const asyncHandler = require('../utils/asyncHandler');

const getHistoricalAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getHistoricalAnalytics(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

const getEnergyAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getEnergyAnalytics(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

const getFuelAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getFuelAnalytics(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

const getRenewableAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getRenewableAnalytics(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

const getGeneratorAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getGeneratorAnalytics(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

const getBatteryAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getBatteryAnalytics(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getHistoricalAnalytics,
  getEnergyAnalytics,
  getFuelAnalytics,
  getRenewableAnalytics,
  getGeneratorAnalytics,
  getBatteryAnalytics,
};

