const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardData = asyncHandler(async (req, res) => {
  const dashboard = await dashboardService.getDashboardData(req.params.stationId);
  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

module.exports = {
  getDashboardData,
};
