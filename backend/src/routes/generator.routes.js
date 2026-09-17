const express = require('express');
const generatorController = require('../controllers/generator.controller');
const validate = require('../middleware/validation.middleware');
const {
  idParamSchema,
  stationParamSchema,
  createGeneratorSchema,
  updateGeneratorSchema,
  updateGeneratorStatusSchema,
  createGeneratorReadingSchema,
} = require('../validators/generator.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// List by station
router.get('/:stationId', validate(stationParamSchema), generatorController.getStationGenerators);

// Single generator detail
router.get('/detail/:id', validate(idParamSchema), generatorController.getGeneratorById);

// Generator management
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createGeneratorSchema),
  generatorController.createGenerator
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateGeneratorSchema),
  generatorController.updateGenerator
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateGeneratorStatusSchema),
  generatorController.updateGeneratorStatus
);

// Readings
router.get('/:id/readings', validate(idParamSchema), generatorController.getGeneratorReadings);

router.post(
  '/:id/readings',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createGeneratorReadingSchema),
  generatorController.addGeneratorReading
);

module.exports = router;
