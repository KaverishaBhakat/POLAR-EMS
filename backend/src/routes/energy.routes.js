const express = require('express');
const energyController = require('../controllers/energy.controller');
const validate = require('../middleware/validation.middleware');
const {
  stationParamSchema,
  historyQuerySchema,
  rangeQuerySchema,
  createEnergyLoadSchema,
} = require('../validators/energy.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/:stationId/latest', validate(stationParamSchema), energyController.getLatestEnergy);
router.get('/:stationId/history', validate(historyQuerySchema), energyController.getEnergyHistory);
router.get('/:stationId/range', validate(rangeQuerySchema), energyController.getEnergyRange);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createEnergyLoadSchema),
  energyController.recordEnergy
);

module.exports = router;
