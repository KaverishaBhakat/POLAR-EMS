const { z } = require('zod');

const stationParamSchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

const historyQuerySchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
  query: z.object({
    limit: z.coerce.number().min(1).max(500).optional().default(50),
    page: z.coerce.number().min(1).optional().default(1),
  }),
};

const rangeQuerySchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
  query: z.object({
    start: z.string().datetime({ message: 'start must be a valid ISO-8601 date string' }).optional(),
    end: z.string().datetime({ message: 'end must be a valid ISO-8601 date string' }).optional(),
    limit: z.coerce.number().min(1).max(1000).optional().default(100),
  }),
};

const createEnergyLoadSchema = {
  body: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    timestamp: z.string().datetime().optional(),
    totalLoad: z.number().nonnegative('totalLoad must be non-negative'),
    heatingLoad: z.number().nonnegative().optional().default(0),
    waterLoad: z.number().nonnegative().optional().default(0),
    communicationLoad: z.number().nonnegative().optional().default(0),
    laboratoryLoad: z.number().nonnegative().optional().default(0),
    refrigerationLoad: z.number().nonnegative().optional().default(0),
    flexibleLoad: z.number().nonnegative().optional().default(0),
  }),
};

const createRenewableSchema = {
  body: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    timestamp: z.string().datetime().optional(),
    solarPower: z.number().nonnegative('solarPower must be non-negative'),
    windPower: z.number().nonnegative('windPower must be non-negative'),
    totalRenewable: z.number().nonnegative().optional(),
  }),
};

module.exports = {
  stationParamSchema,
  historyQuerySchema,
  rangeQuerySchema,
  createEnergyLoadSchema,
  createRenewableSchema,
};
