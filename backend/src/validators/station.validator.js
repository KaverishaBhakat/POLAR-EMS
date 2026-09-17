const { z } = require('zod');

const stationParamSchema = {
  params: z.object({
    id: z.string().min(1, 'Station ID is required'),
  }),
};

const createStationSchema = {
  body: z.object({
    name: z.string().min(2, 'Station name must be at least 2 characters').max(100),
    code: z.string().min(2, 'Station code is required').max(20).toUpperCase(),
    location: z.string().min(2, 'Location description is required'),
    latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
    status: z.string().optional().default('ONLINE'),
    description: z.string().optional(),
  }),
};

const updateStationSchema = {
  params: z.object({
    id: z.string().min(1, 'Station ID is required'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    code: z.string().min(2).max(20).toUpperCase().optional(),
    location: z.string().min(2).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    status: z.string().optional(),
    description: z.string().optional(),
  }),
};

module.exports = {
  stationParamSchema,
  createStationSchema,
  updateStationSchema,
};
