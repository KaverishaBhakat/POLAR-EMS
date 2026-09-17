const { z } = require('zod');

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Generator ID is required'),
  }),
};

const stationParamSchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

const createGeneratorSchema = {
  body: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    name: z.string().min(1, 'Generator name is required'),
    capacity: z.number().positive('Capacity must be positive (kW)'),
    minimumOutput: z.number().nonnegative().optional().default(0),
    efficiency: z.number().min(0).max(100).optional().default(38),
    fuelType: z.string().optional().default('diesel'),
    status: z.enum(['RUNNING', 'STOPPED', 'MAINTENANCE', 'FAULT']).optional().default('STOPPED'),
    fuelLevel: z.number().min(0).max(100).optional().default(100),
    totalRuntime: z.number().nonnegative().optional().default(0),
  }),
};

const updateGeneratorSchema = {
  params: z.object({
    id: z.string().min(1, 'Generator ID is required'),
  }),
  body: z.object({
    name: z.string().optional(),
    capacity: z.number().positive().optional(),
    minimumOutput: z.number().nonnegative().optional(),
    efficiency: z.number().min(0).max(100).optional(),
    fuelType: z.string().optional(),
    status: z.enum(['RUNNING', 'STOPPED', 'MAINTENANCE', 'FAULT']).optional(),
    fuelLevel: z.number().min(0).max(100).optional(),
    totalRuntime: z.number().nonnegative().optional(),
  }),
};

const updateGeneratorStatusSchema = {
  params: z.object({
    id: z.string().min(1, 'Generator ID is required'),
  }),
  body: z.object({
    status: z.enum(['RUNNING', 'STOPPED', 'MAINTENANCE', 'FAULT']),
  }),
};

const createGeneratorReadingSchema = {
  params: z.object({
    id: z.string().min(1, 'Generator ID is required'),
  }),
  body: z.object({
    timestamp: z.string().datetime().optional(),
    powerOutput: z.number().nonnegative('powerOutput must be non-negative (kW)'),
    fuelConsumed: z.number().nonnegative('fuelConsumed must be non-negative (liters)'),
    efficiency: z.number().min(0).max(100).optional().default(38),
    runtime: z.number().nonnegative('runtime in minutes must be non-negative'),
  }),
};

module.exports = {
  idParamSchema,
  stationParamSchema,
  createGeneratorSchema,
  updateGeneratorSchema,
  updateGeneratorStatusSchema,
  createGeneratorReadingSchema,
};
