const subscriptionService = require('../services/subscription.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class SubscriptionController {
  /**
   * Get all subscriptions
   */
  getAllSubscriptions = asyncHandler(async (req, res) => {
    const result = await subscriptionService.getAllSubscriptions(req.user.id, req.query);
    successResponse(res, result, 'Subscriptions retrieved successfully');
  })

  /**
   * Get subscription statistics
   */
  getSubscriptionStatistics = asyncHandler(async (req, res) => {
    const stats = await subscriptionService.getSubscriptionStatistics(req.user.id);
    successResponse(res, stats, 'Subscription statistics retrieved successfully');
  })

  /**
   * Get subscription by ID
   */
  getSubscriptionById = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.getSubscriptionById(req.user.id, req.params.id);
    successResponse(res, subscription, 'Subscription retrieved successfully');
  })

  /**
   * Create new subscription
   */
  createSubscription = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.createSubscription(req.user.id, req.body);
    successResponse(res, subscription, 'Subscription created successfully', 201);
  })

  /**
   * Update subscription
   */
  updateSubscription = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.updateSubscription(req.user.id, req.params.id, req.body);
    successResponse(res, subscription, 'Subscription updated successfully');
  })

  /**
   * Upgrade subscription plan
   */
  upgradePlan = asyncHandler(async (req, res) => {
    const result = await subscriptionService.upgradePlan(req.user.id, req.params.id, req.body);
    successResponse(res, result, 'Subscription plan upgraded successfully');
  })

  /**
   * Cancel subscription
   */
  cancelSubscription = asyncHandler(async (req, res) => {
    const result = await subscriptionService.cancelSubscription(req.user.id, req.params.id, req.body);
    successResponse(res, result, 'Subscription cancelled successfully');
  })

  /**
   * Reactivate subscription
   */
  reactivateSubscription = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.reactivateSubscription(req.user.id, req.params.id, req.body);
    successResponse(res, subscription, 'Subscription reactivated successfully');
  })

  /**
   * Get expiring subscriptions
   */
  getExpiringSubscriptions = asyncHandler(async (req, res) => {
    const { days } = req.query;
    const subscriptions = await subscriptionService.getExpiringSubscriptions(req.user.id, parseInt(days) || 30);
    successResponse(res, subscriptions, 'Expiring subscriptions retrieved successfully');
  })
}

module.exports = new SubscriptionController();