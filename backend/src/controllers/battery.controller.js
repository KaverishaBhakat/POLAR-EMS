const batteryService = require('../services/battery.service');
const asyncHandler = require('../utils/asyncHandler');

const getStationBatteries = asyncHandler(async (req, res) => {
  const batteries = await batteryService.getStationBatteries(req.params.stationId);
  res.status(200).json({
    success: true,
    data: batteries,
  });
});

const getBatteryById = asyncHandler(async (req, res) => {
  const battery = await batteryService.getBatteryById(req.params.id);
  res.status(200).json({
    success: true,
    data: battery,
  });
});

const updateBattery = asyncHandler(async (req, res) => {
  const battery = await batteryService.updateBattery(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Battery parameters updated successfully',
    data: battery,
  });
});

const getBatteryReadings = asyncHandler(async (req, res) => {
  const readings = await batteryService.getBatteryReadings(req.params.id, req.query);
  res.status(200).json({
    success: true,
    data: readings.records,
    meta: readings.meta,
  });
});

const addBatteryReading = asyncHandler(async (req, res) => {
  const reading = await batteryService.addBatteryReading(req.params.id, req.body);
  res.status(201).json({
    success: true,
    message: 'Battery telemetry recorded successfully',
    data: reading,
  });
});

module.exports = {
  getStationBatteries,
  getBatteryById,
  updateBattery,
  getBatteryReadings,
  addBatteryReading,
};
