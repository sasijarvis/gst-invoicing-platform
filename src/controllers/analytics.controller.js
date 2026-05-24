const analyticsService = require('../services/analytics.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class AnalyticsController {
  /**
   * Get customer analytics
   */
  getCustomerAnalytics = asyncHandler(async (req, res) => {
    const analytics = await analyticsService.getCustomerAnalytics(req.user.id, req.query);
    successResponse(res, analytics, 'Customer analytics retrieved successfully');
  })

  /**
   * Get product analytics
   */
  getProductAnalytics = asyncHandler(async (req, res) => {
    const analytics = await analyticsService.getProductAnalytics(req.user.id, req.query);
    successResponse(res, analytics, 'Product analytics retrieved successfully');
  })

  /**
   * Get trends analysis
   */
  getTrendsAnalysis = asyncHandler(async (req, res) => {
    const trends = await analyticsService.getTrendsAnalysis(req.user.id, req.query);
    successResponse(res, trends, 'Trends analysis retrieved successfully');
  })
}

module.exports = new AnalyticsController();