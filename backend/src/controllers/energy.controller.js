const energyService = require('../services/energy.service');
const asyncHandler = require('../utils/asyncHandler');

const getLatestEnergy = asyncHandler(async (req, res) => {
  const latest = await energyService.getLatestEnergy(req.params.stationId);
  res.status(200).json({
    success: true,
    data: latest,
  });
});

const getEnergyHistory = asyncHandler(async (req, res) => {
  const history = await energyService.getEnergyHistory(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: history.records,
    meta: history.meta,
  });
});

const getEnergyRange = asyncHandler(async (req, res) => {
  const rangeData = await energyService.getEnergyRange(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: rangeData,
  });
});

const recordEnergy = asyncHandler(async (req, res) => {
  const record = await energyService.recordEnergy(req.body);
  res.status(201).json({
    success: true,
    message: 'Energy load recorded successfully',
    data: record,
  });
});

module.exports = {
  getLatestEnergy,
  getEnergyHistory,
  getEnergyRange,
  recordEnergy,
};
