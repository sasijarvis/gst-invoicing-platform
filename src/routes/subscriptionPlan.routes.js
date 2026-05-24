const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateParams, validateQuery } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  createPlanSchema,
  updatePlanSchema,
  planIdParamSchema
} = require('../validations/subscriptionPlan.validation');

// Import controller
const subscriptionPlanController = require('../controllers/subscriptionPlan.controller');

const router = express.Router();

// All subscription plan routes require authentication
router.use(authenticateToken);

// Get plan statistics
router.get('/stats',
  logActivity('VIEW_PLAN_STATISTICS', 'subscription-plan'),
  subscriptionPlanController.getPlanStatistics
);

// Get popular plans
router.get('/popular',
  validateQuery(require('joi').object({
    limit: require('joi').number().min(1).max(20).default(5)
  })),
  logActivity('VIEW_POPULAR_PLANS', 'subscription-plan'),
  subscriptionPlanController.getPopularPlans
);

// Search plans
router.get('/search',
  validateQuery(require('joi').object({
    q: require('joi').string().min(2).required(),
    limit: require('joi').number().min(1).max(50).default(10)
  })),
  logActivity('SEARCH_PLANS', 'subscription-plan'),
  subscriptionPlanController.searchPlans
);

// Compare plans
router.post('/compare',
  validateRequest(require('joi').object({
    planIds: require('joi').array().items(require('joi').string()).min(2).required()
  })),
  logActivity('COMPARE_PLANS', 'subscription-plan'),
  subscriptionPlanController.comparePlans
);

// Get all subscription plans
router.get('/',
  validateQuery(require('joi').object({
    page: require('joi').number().min(1).default(1),
    limit: require('joi').number().min(1).max(100).default(10),
    isActive: require('joi').string().valid('true', 'false').optional(),
    type: require('joi').string().valid('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM').optional(),
    billingCycle: require('joi').string().valid('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY').optional(),
    sortBy: require('joi').string().valid('name', 'price', 'type', 'createdAt').default('createdAt'),
    sortOrder: require('joi').string().valid('asc', 'desc').default('desc')
  })),
  logActivity('VIEW_SUBSCRIPTION_PLANS', 'subscription-plan'),
  subscriptionPlanController.getAllPlans
);

// Get subscription plan by ID
router.get('/:id',
  validateParams(planIdParamSchema),
  logActivity('VIEW_SUBSCRIPTION_PLAN', 'subscription-plan'),
  subscriptionPlanController.getPlanById
);

// Create new subscription plan
router.post('/',
  validateRequest(createPlanSchema),
  logActivity('CREATE_SUBSCRIPTION_PLAN', 'subscription-plan'),
  subscriptionPlanController.createPlan
);

// Update subscription plan
router.put('/:id',
  validateParams(planIdParamSchema),
  validateRequest(updatePlanSchema),
  logActivity('UPDATE_SUBSCRIPTION_PLAN', 'subscription-plan'),
  subscriptionPlanController.updatePlan
);

// Delete subscription plan
router.delete('/:id',
  validateParams(planIdParamSchema),
  logActivity('DELETE_SUBSCRIPTION_PLAN', 'subscription-plan'),
  subscriptionPlanController.deletePlan
);

module.exports = router;