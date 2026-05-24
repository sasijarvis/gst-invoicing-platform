const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class AuthController {
  /**
   * Register new user
   */
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    successResponse(res, result, 'User registered successfully', 201);
  })

  /**
   * Login user
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    successResponse(res, result, 'Login successful');
  })

  /**
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    successResponse(res, result, 'Token refreshed successfully');
  })

  /**
   * Logout user (client-side token removal)
   */
  logout = asyncHandler(async (req, res) => {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the tokens. However, we can log this action.
    successResponse(res, null, 'Logout successful');
  })

  /**
   * Get current user profile
   */
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getUserProfile(req.user.id);
    successResponse(res, user, 'Profile retrieved successfully');
  })

  /**
   * Forgot password (placeholder for email implementation)
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    // TODO: Implement email sending functionality
    // For now, return success message
    
    successResponse(res, null, 'Password reset instructions sent to your email');
  })

  /**
   * Reset password (placeholder for email implementation)
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    
    // TODO: Implement password reset with email token verification
    
    successResponse(res, null, 'Password reset successfully');
  })
}

module.exports = new AuthController();