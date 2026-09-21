const ingestService = require('../services/ingest.service');
const asyncHandler = require('../utils/asyncHandler');

const ingestTelemetry = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const result = await ingestService.ingestTelemetry(stationId, req.body);
  res.status(201).json({
    success: true,
    message: 'SCADA telemetry record successfully ingested and committed to database.',
    data: result,
  });
});

const ingestBatch = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const { datasetType, records } = req.body;
  const result = await ingestService.ingestBatch(stationId, datasetType, records);
  res.status(201).json({
    success: true,
    message: `Successfully ingested batch of ${result.insertedCount} ${datasetType} records.`,
    data: result,
  });
});

const getStatus = asyncHandler(async (req, res) => {
  const { stationId } = req.query;
  const status = await ingestService.getStatus(stationId);
  res.status(200).json({
    success: true,
    data: status,
  });
});

const purgeTelemetry = asyncHandler(async (req, res) => {
  const { stationId } = req.body;
  const result = await ingestService.purgeTelemetry(stationId);
  res.status(200).json({
    success: true,
    message: result.message,
    data: result.purged,
  });
});

const getTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;
  let headers = [];
  let sample = {};

  switch (type.toLowerCase()) {
    case 'weather':
      headers = ['timestamp', 'temperature', 'pressure', 'humidity', 'windSpeed', 'windDirection', 'solarRadiation'];
      sample = {
        timestamp: new Date().toISOString(),
        temperature: -14.2,
        pressure: 984.5,
        humidity: 62.0,
        windSpeed: 14.8,
        windDirection: 'SSW',
        solarRadiation: 120.5,
      };
      break;
    case 'energy':
    case 'load':
      headers = ['timestamp', 'totalLoad', 'heatingLoad', 'waterLoad', 'communicationLoad', 'laboratoryLoad', 'refrigerationLoad', 'flexibleLoad'];
      sample = {
        timestamp: new Date().toISOString(),
        totalLoad: 68.4,
        heatingLoad: 32.1,
        waterLoad: 12.0,
        communicationLoad: 6.2,
        laboratoryLoad: 10.5,
        refrigerationLoad: 4.8,
        flexibleLoad: 2.8,
      };
      break;
    case 'renewable':
      headers = ['timestamp', 'solarPower', 'windPower', 'totalRenewable'];
      sample = {
        timestamp: new Date().toISOString(),
        solarPower: 22.5,
        windPower: 38.0,
        totalRenewable: 60.5,
      };
      break;
    default:
      headers = ['timestamp', 'metric', 'value'];
      sample = { timestamp: new Date().toISOString(), metric: 'unknown', value: 0 };
  }

  res.status(200).json({
    success: true,
    data: {
      type,
      headers,
      sample,
      csvHeader: headers.join(','),
      csvSampleRow: Object.values(sample).join(','),
    },
  });
});

module.exports = {
  ingestTelemetry,
  ingestBatch,
  getStatus,
  purgeTelemetry,
  getTemplate,
};
