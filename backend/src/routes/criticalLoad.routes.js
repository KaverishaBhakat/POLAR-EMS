const express = require('express');
const { z } = require('zod');
const criticalLoadController = require('../controllers/criticalLoad.controller');
const validate = require('../middleware/validation.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

const stationParam = {
  params: z.object({ stationId: z.string().min(1) }),
};

const idParam = {
  params: z.object({ id: z.string().min(1) }),
};

const createCriticalLoadSchema = {
  body: z.object({
    stationId: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(['CRITICAL', 'IMPORTANT', 'FLEXIBLE']),
    priority: z.number().int().positive(),
    ratedPower: z.number().positive(),
    currentPower: z.number().nonnegative(),
    status: z.string().optional().default('ONLINE'),
  }),
};

const updateCriticalLoadSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().optional(),
    category: z.enum(['CRITICAL', 'IMPORTANT', 'FLEXIBLE']).optional(),
    priority: z.number().int().positive().optional(),
    ratedPower: z.number().positive().optional(),
    currentPower: z.number().nonnegative().optional(),
    status: z.string().optional(),
  }),
};

const updateStatusSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.string().min(1),
  }),
};

router.get('/:stationId', validate(stationParam), criticalLoadController.getStationCriticalLoads);
router.get('/detail/:id', validate(idParam), criticalLoadController.getCriticalLoadById);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(createCriticalLoadSchema),
  criticalLoadController.createCriticalLoad
);

router.post(
  '/:stationId',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  (req, res, next) => {
    if (!req.body.stationId && req.params.stationId) req.body.stationId = req.params.stationId;
    next();
  },
  validate(createCriticalLoadSchema),
  criticalLoadController.createCriticalLoad
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateCriticalLoadSchema),
  criticalLoadController.updateCriticalLoad
);

router.put(
  '/:stationId/:id',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateCriticalLoadSchema),
  criticalLoadController.updateCriticalLoad
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateStatusSchema),
  criticalLoadController.updateCriticalLoadStatus
);

router.patch(
  '/:stationId/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  validate(updateStatusSchema),
  criticalLoadController.updateCriticalLoadStatus
);

module.exports = router;
