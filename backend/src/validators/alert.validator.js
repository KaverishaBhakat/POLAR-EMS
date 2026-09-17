const { z } = require('zod');

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Alert ID is required'),
  }),
};

const stationParamSchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

const createAlertSchema = {
  body: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    type: z.enum([
      'BATTERY_LOW',
      'HIGH_LOAD',
      'GENERATOR_FAULT',
      'LOW_FUEL',
      'EXTREME_WEATHER',
      'RENEWABLE_LOW',
      'CRITICAL_LOAD_RISK',
      'SYSTEM',
    ]),
    severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
    title: z.string().min(1, 'Title is required'),
    message: z.string().min(1, 'Message is required'),
    status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']).optional().default('ACTIVE'),
    source: z.string().min(1, 'Source is required'),
  }),
};

module.exports = {
  idParamSchema,
  stationParamSchema,
  createAlertSchema,
};
