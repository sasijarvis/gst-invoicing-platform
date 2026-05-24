const express = require('express');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

// Import validation schemas
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validations/auth.validation');

// Import controller
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Public routes
router.post('/register', 
  authLimiter,
  validateRequest(registerSchema),
  authController.register
);

router.post('/login',
  authLimiter,
  validateRequest(loginSchema),
  authController.login
);

router.post('/refresh-token',
  validateRequest(refreshTokenSchema),
  authController.refreshToken
);

router.post('/forgot-password',
  passwordResetLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);

router.post('/reset-password',
  passwordResetLimiter,
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

// Protected routes
router.post('/logout',
  authenticateToken,
  authController.logout
);

router.get('/me',
  authenticateToken,
  authController.getMe
);

module.exports = router;