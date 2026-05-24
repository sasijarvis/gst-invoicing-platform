const settingsService = require('../services/settings.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class SettingsController {
  /**
   * Get user settings
   */
  getUserSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.getUserSettings(req.user.id);
    successResponse(res, settings, 'User settings retrieved successfully');
  })

  /**
   * Update user settings
   */
  updateUserSettings = asyncHandler(async (req, res) => {
    const updatedSettings = await settingsService.updateUserSettings(req.user.id, req.body);
    successResponse(res, updatedSettings, 'Settings updated successfully');
  })

  /**
   * Get system information
   */
  getSystemInfo = asyncHandler(async (req, res) => {
    const systemInfo = await settingsService.getSystemInfo();
    successResponse(res, systemInfo, 'System information retrieved successfully');
  })

  /**
   * Get invoice templates
   */
  getInvoiceTemplates = asyncHandler(async (req, res) => {
    const templates = await settingsService.getInvoiceTemplates(req.user.id);
    successResponse(res, templates, 'Invoice templates retrieved successfully');
  })

  /**
   * Get recent activity
   */
  getRecentActivity = asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const activity = await settingsService.getRecentActivity(req.user.id, parseInt(limit) || 10);
    successResponse(res, activity, 'Recent activity retrieved successfully');
  })

  /**
   * Global search
   */
  globalSearch = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const results = await settingsService.globalSearch(req.user.id, q, parseInt(limit) || 20);
    successResponse(res, results, 'Search completed successfully');
  })
}

module.exports = new SettingsController();