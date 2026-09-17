const criticalLoadService = require('../services/criticalLoad.service');
const asyncHandler = require('../utils/asyncHandler');

const getStationCriticalLoads = asyncHandler(async (req, res) => {
  const loads = await criticalLoadService.getStationCriticalLoads(req.params.stationId);
  res.status(200).json({
    success: true,
    data: loads,
  });
});

const getCriticalLoadById = asyncHandler(async (req, res) => {
  const load = await criticalLoadService.getCriticalLoadById(req.params.id);
  res.status(200).json({
    success: true,
    data: load,
  });
});

const createCriticalLoad = asyncHandler(async (req, res) => {
  const load = await criticalLoadService.createCriticalLoad(req.body);
  res.status(201).json({
    success: true,
    message: 'Critical load circuit created successfully',
    data: load,
  });
});

const updateCriticalLoad = asyncHandler(async (req, res) => {
  const load = await criticalLoadService.updateCriticalLoad(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Critical load circuit updated successfully',
    data: load,
  });
});

const updateCriticalLoadStatus = asyncHandler(async (req, res) => {
  const load = await criticalLoadService.updateCriticalLoadStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: 'Critical load circuit status updated successfully',
    data: load,
  });
});

module.exports = {
  getStationCriticalLoads,
  getCriticalLoadById,
  createCriticalLoad,
  updateCriticalLoad,
  updateCriticalLoadStatus,
};
