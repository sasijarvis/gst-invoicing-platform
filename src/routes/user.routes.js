const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { validateRequest, validateParams } = require('../middleware/validation.middleware');

// Import validation schemas
const {
  updateProfileSchema,
  changePasswordSchema,
  updateUserStatusSchema,
  userIdParamSchema
} = require('../validations/user.validation');

// Import controller
const userController = require('../controllers/user.controller');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// User profile routes
router.get('/profile', userController.getProfile);

router.put('/profile',
  validateRequest(updateProfileSchema),
  userController.updateProfile
);

router.put('/change-password',
  validateRequest(changePasswordSchema),
  userController.changePassword
);

// Admin only routes
router.get('/',
  requireRole(['ADMIN']),
  userController.getAllUsers
);

router.put('/:id/status',
  requireRole(['ADMIN']),
  validateParams(userIdParamSchema),
  validateRequest(updateUserStatusSchema),
  userController.updateUserStatus
);

module.exports = router;