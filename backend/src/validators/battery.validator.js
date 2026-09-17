const { z } = require('zod');

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Battery ID is required'),
  }),
};

const stationParamSchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

const updateBatterySchema = {
  params: z.object({
    id: z.string().min(1, 'Battery ID is required'),
  }),
  body: z.object({
    name: z.string().optional(),
    capacity: z.number().positive().optional(),
    currentSOC: z.number().min(0).max(100, 'currentSOC must be between 0 and 100').optional(),
    minimumSOC: z.number().min(0).max(100).optional(),
    maximumSOC: z.number().min(0).max(100).optional(),
    maxChargePower: z.number().positive().optional(),
    maxDischargePower: z.number().positive().optional(),
    status: z.string().optional(),
  }),
};

const createBatteryReadingSchema = {
  params: z.object({
    id: z.string().min(1, 'Battery ID is required'),
  }),
  body: z.object({
    timestamp: z.string().datetime().optional(),
    soc: z.number().min(0).max(100, 'soc must be between 0 and 100'),
    chargePower: z.number().nonnegative().optional().default(0),
    dischargePower: z.number().nonnegative().optional().default(0),
  }),
};

module.exports = {
  idParamSchema,
  stationParamSchema,
  updateBatterySchema,
  createBatteryReadingSchema,
};
