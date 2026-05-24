const dashboardService = require('../services/dashboard.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class DashboardController {
  /**
   * Get main dashboard data
   */
  getDashboardData = asyncHandler(async (req, res) => {
    const dashboardData = await dashboardService.getDashboardData(req.user.id, req.query);
    successResponse(res, dashboardData, 'Dashboard data retrieved successfully');
  })
}

module.exports = new DashboardController();