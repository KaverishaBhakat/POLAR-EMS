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

const createWeatherSchema = {
  body: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    timestamp: z.string().datetime().optional(),
    temperature: z.number({ required_error: 'temperature is required' }),
    pressure: z.number({ required_error: 'pressure is required' }).positive(),
    humidity: z.number().min(0).max(100, 'humidity must be between 0 and 100'),
    windSpeed: z.number().min(0, 'windSpeed must be positive'),
    windDirection: z.string().min(1, 'windDirection is required'),
    solarRadiation: z.number().min(0, 'solarRadiation must be positive'),
  }),
};

module.exports = {
  stationParamSchema,
  historyQuerySchema,
  rangeQuerySchema,
  createWeatherSchema,
};
