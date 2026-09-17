const express = require('express');
const renewableController = require('../controllers/renewable.controller');
const validate = require('../middleware/validation.middleware');
const {
  stationParamSchema,
  historyQuerySchema,
  rangeQuerySchema,
  createRenewableSchema,
} = require('../validators/energy.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/:stationId/latest', validate(stationParamSchema), renewableController.getLatestRenewable);
router.get('/:stationId/history', validate(historyQuerySchema), renewableController.getRenewableHistory);
router.get('/:stationId/range', validate(rangeQuerySchema), renewableController.getRenewableRange);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createRenewableSchema),
  renewableController.recordRenewable
);

module.exports = router;
