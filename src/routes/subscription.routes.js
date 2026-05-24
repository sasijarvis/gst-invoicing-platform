const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateParams, validateQuery } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  upgradePlanSchema,
  cancelSubscriptionSchema,
  subscriptionIdParamSchema,
  subscriptionQuerySchema
} = require('../validations/subscription.validation');

// Import controller
const subscriptionController = require('../controllers/subscription.controller');

const router = express.Router();

// All subscription routes require authentication
router.use(authenticateToken);

// Get subscription statistics
router.get('/stats',
  logActivity('VIEW_SUBSCRIPTION_STATISTICS', 'subscription'),
  subscriptionController.getSubscriptionStatistics
);

// Get expiring subscriptions
router.get('/expiring',
  validateQuery(require('joi').object({
    days: require('joi').number().min(1).max(365).default(30)
  })),
  logActivity('VIEW_EXPIRING_SUBSCRIPTIONS', 'subscription'),
  subscriptionController.getExpiringSubscriptions
);

// Get all subscriptions
router.get('/',
  validateQuery(subscriptionQuerySchema),
  logActivity('VIEW_SUBSCRIPTIONS', 'subscription'),
  subscriptionController.getAllSubscriptions
);

// Get subscription by ID
router.get('/:id',
  validateParams(subscriptionIdParamSchema),
  logActivity('VIEW_SUBSCRIPTION', 'subscription'),
  subscriptionController.getSubscriptionById
);

// Create new subscription
router.post('/',
  validateRequest(createSubscriptionSchema),
  logActivity('CREATE_SUBSCRIPTION', 'subscription'),
  subscriptionController.createSubscription
);

// Update subscription
router.put('/:id',
  validateParams(subscriptionIdParamSchema),
  validateRequest(updateSubscriptionSchema),
  logActivity('UPDATE_SUBSCRIPTION', 'subscription'),
  subscriptionController.updateSubscription
);

// Upgrade subscription plan
router.post('/:id/upgrade',
  validateParams(subscriptionIdParamSchema),
  validateRequest(upgradePlanSchema),
  logActivity('UPGRADE_SUBSCRIPTION', 'subscription'),
  subscriptionController.upgradePlan
);

// Cancel subscription
router.post('/:id/cancel',
  validateParams(subscriptionIdParamSchema),
  validateRequest(cancelSubscriptionSchema),
  logActivity('CANCEL_SUBSCRIPTION', 'subscription'),
  subscriptionController.cancelSubscription
);

// Reactivate subscription
router.post('/:id/reactivate',
  validateParams(subscriptionIdParamSchema),
  validateRequest(require('joi').object({
    notes: require('joi').string().max(300).optional().allow(''),
    customPrice: require('joi').number().min(0).optional(),
    autoRenew: require('joi').boolean().default(true)
  })),
  logActivity('REACTIVATE_SUBSCRIPTION', 'subscription'),
  subscriptionController.reactivateSubscription
);

module.exports = router;