const reportsService = require('../services/reports.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class ReportsController {
  /**
   * Generate sales report
   */
  getSalesReport = asyncHandler(async (req, res) => {
    const report = await reportsService.getSalesReport(req.user.id, req.query);
    successResponse(res, report, 'Sales report generated successfully');
  })

  /**
   * Generate GST report
   */
  getGSTReport = asyncHandler(async (req, res) => {
    const report = await reportsService.getGSTReport(req.user.id, req.query);
    successResponse(res, report, 'GST report generated successfully');
  })

  /**
   * Generate aging report
   */
  getAgingReport = asyncHandler(async (req, res) => {
    const report = await reportsService.getAgingReport(req.user.id, req.query);
    successResponse(res, report, 'Aging report generated successfully');
  })

  /**
   * Generate profit & loss report
   */
  getProfitLossReport = asyncHandler(async (req, res) => {
    const report = await reportsService.getProfitLossReport(req.user.id, req.query);
    successResponse(res, report, 'Profit & Loss report generated successfully');
  })

  /**
   * Export report (placeholder)
   */
  exportReport = asyncHandler(async (req, res) => {
    // TODO: Implement actual export functionality
    successResponse(res, { 
      message: 'Export functionality to be implemented',
      format: req.body.format,
      reportType: req.body.reportType
    }, 'Export request processed');
  })
}

module.exports = new ReportsController();