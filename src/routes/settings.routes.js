const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateQuery } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import controller
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

// All settings routes require authentication
router.use(authenticateToken);

// Get user settings
router.get('/',
  logActivity('VIEW_SETTINGS', 'settings'),
  settingsController.getUserSettings
);

// Update user settings
router.put('/',
  validateRequest(Joi.object({
    userInfo: Joi.object({
      firstName: Joi.string().min(2).max(50).optional(),
      lastName: Joi.string().min(2).max(50).optional(),
      phone: Joi.string().optional().allow(''),
      businessName: Joi.string().max(100).optional().allow(''),
      gstNumber: Joi.string().optional().allow(''),
      panNumber: Joi.string().optional().allow(''),
      businessAddress: Joi.string().max(200).optional().allow(''),
      businessCity: Joi.string().max(50).optional().allow(''),
      businessState: Joi.string().max(50).optional().allow(''),
      businessPincode: Joi.string().pattern(/^[0-9]{6}$/).optional().allow(''),
      businessCountry: Joi.string().max(50).optional().allow('')
    }).optional(),
    settings: Joi.object().optional()
  })),
  logActivity('UPDATE_SETTINGS', 'settings'),
  settingsController.updateUserSettings
);

// Get invoice templates
router.get('/templates',
  logActivity('VIEW_INVOICE_TEMPLATES', 'settings'),
  settingsController.getInvoiceTemplates
);

module.exports = router;