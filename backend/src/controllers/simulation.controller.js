const simulationService = require('../services/simulation.service');
const asyncHandler = require('../utils/asyncHandler');

const runSimulation = asyncHandler(async (req, res) => {
  // Use authenticated user ID or demo user ID fallback
  const userId = req.user ? req.user.id : req.body.userId;
  const result = await simulationService.runSimulation(userId, req.body);
  res.status(201).json({
    success: true,
    message: 'Rule-based simulation executed successfully',
    data: result,
  });
});

const getSimulationById = asyncHandler(async (req, res) => {
  const simulation = await simulationService.getSimulationById(req.params.id);
  res.status(200).json({
    success: true,
    data: simulation,
  });
});

const getSimulationHistory = asyncHandler(async (req, res) => {
  const history = await simulationService.getSimulationHistory(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: history.records,
    meta: history.meta,
  });
});

module.exports = {
  runSimulation,
  getSimulationById,
  getSimulationHistory,
};
