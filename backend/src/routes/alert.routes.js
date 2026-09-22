const express = require('express');
const alertController = require('../controllers/alert.controller');
const validate = require('../middleware/validation.middleware');
const {
  idParamSchema,
  stationParamSchema,
  createAlertSchema,
} = require('../validators/alert.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', alertController.getStationAlerts);
router.get('/:stationId', validate(stationParamSchema), alertController.getStationAlerts);
router.get('/:stationId/active', validate(stationParamSchema), alertController.getActiveAlerts);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createAlertSchema),
  alertController.createAlert
);

router.patch(
  '/:id/acknowledge',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(idParamSchema),
  alertController.acknowledgeAlert
);

router.patch(
  '/:id/resolve',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(idParamSchema),
  alertController.resolveAlert
);

module.exports = router;
