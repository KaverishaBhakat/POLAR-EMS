const renewableService = require('../services/renewable.service');
const asyncHandler = require('../utils/asyncHandler');

const getLatestRenewable = asyncHandler(async (req, res) => {
  const latest = await renewableService.getLatestRenewable(req.params.stationId);
  res.status(200).json({
    success: true,
    data: latest,
  });
});

const getRenewableHistory = asyncHandler(async (req, res) => {
  const history = await renewableService.getRenewableHistory(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: history.records,
    meta: history.meta,
  });
});

const getRenewableRange = asyncHandler(async (req, res) => {
  const rangeData = await renewableService.getRenewableRange(req.params.stationId, req.query);
  res.status(200).json({
    success: true,
    data: rangeData,
  });
});

const recordRenewable = asyncHandler(async (req, res) => {
  const record = await renewableService.recordRenewable(req.body);
  res.status(201).json({
    success: true,
    message: 'Renewable generation reading recorded successfully',
    data: record,
  });
});

module.exports = {
  getLatestRenewable,
  getRenewableHistory,
  getRenewableRange,
  recordRenewable,
};
