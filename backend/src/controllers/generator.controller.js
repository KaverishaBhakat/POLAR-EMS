const generatorService = require('../services/generator.service');
const asyncHandler = require('../utils/asyncHandler');

const getStationGenerators = asyncHandler(async (req, res) => {
  const generators = await generatorService.getStationGenerators(req.params.stationId);
  res.status(200).json({
    success: true,
    data: generators,
  });
});

const getGeneratorById = asyncHandler(async (req, res) => {
  const generator = await generatorService.getGeneratorById(req.params.id);
  res.status(200).json({
    success: true,
    data: generator,
  });
});

const createGenerator = asyncHandler(async (req, res) => {
  const generator = await generatorService.createGenerator(req.body);
  res.status(201).json({
    success: true,
    message: 'Generator created successfully',
    data: generator,
  });
});

const updateGenerator = asyncHandler(async (req, res) => {
  const generator = await generatorService.updateGenerator(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Generator updated successfully',
    data: generator,
  });
});

const updateGeneratorStatus = asyncHandler(async (req, res) => {
  const generator = await generatorService.updateGeneratorStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: 'Generator status updated successfully',
    data: generator,
  });
});

const getGeneratorReadings = asyncHandler(async (req, res) => {
  const readings = await generatorService.getGeneratorReadings(req.params.id, req.query);
  res.status(200).json({
    success: true,
    data: readings.records,
    meta: readings.meta,
  });
});

const addGeneratorReading = asyncHandler(async (req, res) => {
  const reading = await generatorService.addGeneratorReading(req.params.id, req.body);
  res.status(201).json({
    success: true,
    message: 'Generator reading recorded successfully',
    data: reading,
  });
});

module.exports = {
  getStationGenerators,
  getGeneratorById,
  createGenerator,
  updateGenerator,
  updateGeneratorStatus,
  getGeneratorReadings,
  addGeneratorReading,
};
