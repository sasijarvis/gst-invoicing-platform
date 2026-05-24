const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateQuery } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import controller
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

// System info (public endpoint)
router.get('/info',
  settingsController.getSystemInfo
);

// Protected endpoints require authentication
router.use(authenticateToken);

// Get recent activity
router.get('/recent-activity',
  validateQuery(Joi.object({
    limit: Joi.number().min(1).max(50).default(10)
  })),
  logActivity('VIEW_RECENT_ACTIVITY', 'system'),
  settingsController.getRecentActivity
);

// Global search
router.get('/search',
  validateQuery(Joi.object({
    q: Joi.string().min(2).required(),
    limit: Joi.number().min(1).max(50).default(20)
  })),
  logActivity('GLOBAL_SEARCH', 'system'),
  settingsController.globalSearch
);

module.exports = router;