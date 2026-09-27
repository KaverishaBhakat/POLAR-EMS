const express = require('express');
const simulationController = require('../controllers/simulation.controller');
const validate = require('../middleware/validation.middleware');
const {
  runSimulationSchema,
  idParamSchema,
  stationParamSchema,
} = require('../validators/simulation.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// ML Resilience & Simulation Microservice Proxy Endpoints
router.get('/scenarios', simulationController.getSimulationScenarios);
router.get('/run/:stationId/:scenarioId', simulationController.runResilienceSimulation);

router.post(
  '/run',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(runSimulationSchema),
  simulationController.runSimulation
);

router.get('/:id', validate(idParamSchema), simulationController.getSimulationById);

router.get(
  '/:stationId/history',
  validate(stationParamSchema),
  simulationController.getSimulationHistory
);

module.exports = router;
