const stationService = require('../services/station.service');
const asyncHandler = require('../utils/asyncHandler');

const getAllStations = asyncHandler(async (req, res) => {
  const stations = await stationService.getAllStations();
  res.status(200).json({
    success: true,
    data: stations,
  });
});

const getStationById = asyncHandler(async (req, res) => {
  const station = await stationService.getStationById(req.params.id);
  res.status(200).json({
    success: true,
    data: station,
  });
});

const createStation = asyncHandler(async (req, res) => {
  const station = await stationService.createStation(req.body);
  res.status(201).json({
    success: true,
    message: 'Station created successfully',
    data: station,
  });
});

const updateStation = asyncHandler(async (req, res) => {
  const station = await stationService.updateStation(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Station updated successfully',
    data: station,
  });
});

const deleteStation = asyncHandler(async (req, res) => {
  await stationService.deleteStation(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Station deleted successfully',
  });
});

const getStationSummary = asyncHandler(async (req, res) => {
  const summary = await stationService.getStationSummary(req.params.id);
  res.status(200).json({
    success: true,
    data: summary,
  });
});

module.exports = {
  getAllStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
  getStationSummary,
};
