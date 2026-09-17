const express = require('express');
const batteryController = require('../controllers/battery.controller');
const validate = require('../middleware/validation.middleware');
const {
  idParamSchema,
  stationParamSchema,
  updateBatterySchema,
  createBatteryReadingSchema,
} = require('../validators/battery.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/:stationId', validate(stationParamSchema), batteryController.getStationBatteries);
router.get('/detail/:id', validate(idParamSchema), batteryController.getBatteryById);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateBatterySchema),
  batteryController.updateBattery
);

router.get('/:id/readings', validate(idParamSchema), batteryController.getBatteryReadings);

router.post(
  '/:id/readings',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createBatteryReadingSchema),
  batteryController.addBatteryReading
);

module.exports = router;
