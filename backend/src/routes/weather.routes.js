const express = require('express');
const weatherController = require('../controllers/weather.controller');
const validate = require('../middleware/validation.middleware');
const {
  stationParamSchema,
  historyQuerySchema,
  rangeQuerySchema,
  createWeatherSchema,
} = require('../validators/weather.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/:stationId/latest', validate(stationParamSchema), weatherController.getLatestWeather);
router.get('/:stationId/history', validate(historyQuerySchema), weatherController.getWeatherHistory);
router.get('/:stationId/range', validate(rangeQuerySchema), weatherController.getWeatherRange);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createWeatherSchema),
  weatherController.recordWeather
);

module.exports = router;
