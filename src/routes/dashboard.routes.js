const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateQuery } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const { dashboardSchema } = require('../validations/report.validation');

// Import controller
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Get main dashboard data
router.get('/',
  validateQuery(dashboardSchema),
  logActivity('VIEW_DASHBOARD', 'dashboard'),
  dashboardController.getDashboardData
);

module.exports = router;