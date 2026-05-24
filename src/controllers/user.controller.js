const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class UserController {
  /**
   * Get user profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getUserProfile(req.user.id);
    successResponse(res, user, 'Profile retrieved successfully');
  })

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);
    successResponse(res, user, 'Profile updated successfully');
  })

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    successResponse(res, result, 'Password changed successfully');
  })

  /**
   * Get all users (Admin only)
   */
  getAllUsers = asyncHandler(async (req, res) => {
    // TODO: Implement pagination and filtering
    successResponse(res, [], 'Users retrieved successfully (placeholder)');
  })

  /**
   * Update user status (Admin only)
   */
  updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    
    // TODO: Implement user status update
    successResponse(res, null, 'User status updated successfully (placeholder)');
  })
}

module.exports = new UserController();