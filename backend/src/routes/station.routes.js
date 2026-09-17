const express = require('express');
const stationController = require('../controllers/station.controller');
const validate = require('../middleware/validation.middleware');
const {
  stationParamSchema,
  createStationSchema,
  updateStationSchema,
} = require('../validators/station.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public / Read-Only station routes
router.get('/', stationController.getAllStations);
router.get('/:id', validate(stationParamSchema), stationController.getStationById);
router.get('/:id/summary', validate(stationParamSchema), stationController.getStationSummary);

// Protected Station Management (ADMIN only)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createStationSchema),
  stationController.createStation
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateStationSchema),
  stationController.updateStation
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(stationParamSchema),
  stationController.deleteStation
);

module.exports = router;
