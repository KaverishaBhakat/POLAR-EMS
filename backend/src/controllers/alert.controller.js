const alertService = require('../services/alert.service');
const asyncHandler = require('../utils/asyncHandler');

const getStationAlerts = asyncHandler(async (req, res) => {
  const alerts = await alertService.getStationAlerts(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: alerts.records,
    meta: alerts.meta,
  });
});

const getActiveAlerts = asyncHandler(async (req, res) => {
  const alerts = await alertService.getActiveStationAlerts(req.params.stationId);
  res.status(200).json({
    success: true,
    data: alerts,
  });
});

const createAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.createAlert(req.body);
  res.status(201).json({
    success: true,
    message: 'Alert generated successfully',
    data: alert,
  });
});

const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.acknowledgeAlert(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Alert acknowledged successfully',
    data: alert,
  });
});

const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.resolveAlert(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Alert marked as resolved',
    data: alert,
  });
});

module.exports = {
  getStationAlerts,
  getActiveAlerts,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
};
