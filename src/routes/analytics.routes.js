const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateQuery } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  customerAnalyticsSchema,
  productAnalyticsSchema,
  trendsAnalysisSchema
} = require('../validations/report.validation');

// Import controller
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Get customer analytics
router.get('/customers',
  validateQuery(customerAnalyticsSchema),
  logActivity('VIEW_CUSTOMER_ANALYTICS', 'analytics'),
  analyticsController.getCustomerAnalytics
);

// Get product analytics
router.get('/products',
  validateQuery(productAnalyticsSchema),
  logActivity('VIEW_PRODUCT_ANALYTICS', 'analytics'),
  analyticsController.getProductAnalytics
);

// Get trends analysis
router.get('/trends',
  validateQuery(trendsAnalysisSchema),
  logActivity('VIEW_TRENDS_ANALYSIS', 'analytics'),
  analyticsController.getTrendsAnalysis
);

module.exports = router;