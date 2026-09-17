const { z } = require('zod');

const runSimulationSchema = {
  body: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    name: z.string().min(1, 'Scenario name is required').max(100),
    temperature: z.number().min(-70).max(30, 'Temperature must be realistic polar range (-70°C to +30°C)'),
    windSpeed: z.number().min(0).max(60, 'Wind speed must be between 0 and 60 m/s'),
    solarAvailability: z.number().min(0).max(1, 'Solar availability factor must be between 0.0 and 1.0'),
    occupancy: z.number().int().min(1).max(200, 'Station occupancy must be realistic'),
    batterySOC: z.number().min(0).max(100, 'Battery SOC must be between 0 and 100%'),
    renewableForecastError: z.number().min(-100).max(100).optional().default(0),
    generatorFailure: z.boolean().optional().default(false),
  }),
};

const idParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Simulation ID is required'),
  }),
};

const stationParamSchema = {
  params: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
  }),
};

module.exports = {
  runSimulationSchema,
  idParamSchema,
  stationParamSchema,
};
