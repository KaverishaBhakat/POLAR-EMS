const weatherService = require('../services/weather.service');
const asyncHandler = require('../utils/asyncHandler');

const getLatestWeather = asyncHandler(async (req, res) => {
  const latest = await weatherService.getLatestWeather(req.params.stationId);
  res.status(200).json({
    success: true,
    data: latest,
  });
});

const getWeatherHistory = asyncHandler(async (req, res) => {
  const history = await weatherService.getWeatherHistory(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: history.records,
    meta: history.meta,
  });
});

const getWeatherRange = asyncHandler(async (req, res) => {
  const rangeData = await weatherService.getWeatherRange(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: rangeData,
  });
});

const recordWeather = asyncHandler(async (req, res) => {
  const record = await weatherService.recordWeather(req.body);
  res.status(201).json({
    success: true,
    message: 'Weather observation recorded successfully',
    data: record,
  });
});

module.exports = {
  getLatestWeather,
  getWeatherHistory,
  getWeatherRange,
  recordWeather,
};
