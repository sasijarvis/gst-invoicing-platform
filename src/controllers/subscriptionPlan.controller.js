const subscriptionPlanService = require('../services/subscriptionPlan.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class SubscriptionPlanController {
  /**
   * Get all subscription plans
   */
  getAllPlans = asyncHandler(async (req, res) => {
    const result = await subscriptionPlanService.getAllPlans(req.user.id, req.query);
    successResponse(res, result, 'Subscription plans retrieved successfully');
  })

  /**
   * Get plan statistics
   */
  getPlanStatistics = asyncHandler(async (req, res) => {
    const stats = await subscriptionPlanService.getPlanStatistics(req.user.id);
    successResponse(res, stats, 'Plan statistics retrieved successfully');
  })

  /**
   * Get plan by ID
   */
  getPlanById = asyncHandler(async (req, res) => {
    const plan = await subscriptionPlanService.getPlanById(req.user.id, req.params.id);
    successResponse(res, plan, 'Subscription plan retrieved successfully');
  })

  /**
   * Create new subscription plan
   */
  createPlan = asyncHandler(async (req, res) => {
    const plan = await subscriptionPlanService.createPlan(req.user.id, req.body);
    successResponse(res, plan, 'Subscription plan created successfully', 201);
  })

  /**
   * Update subscription plan
   */
  updatePlan = asyncHandler(async (req, res) => {
    const plan = await subscriptionPlanService.updatePlan(req.user.id, req.params.id, req.body);
    successResponse(res, plan, 'Subscription plan updated successfully');
  })

  /**
   * Delete subscription plan
   */
  deletePlan = asyncHandler(async (req, res) => {
    const result = await subscriptionPlanService.deletePlan(req.user.id, req.params.id);
    successResponse(res, result, result.message);
  })

  /**
   * Get popular plans
   */
  getPopularPlans = asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const plans = await subscriptionPlanService.getPopularPlans(req.user.id, parseInt(limit) || 5);
    successResponse(res, plans, 'Popular plans retrieved successfully');
  })

  /**
   * Search plans
   */
  searchPlans = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const plans = await subscriptionPlanService.searchPlans(req.user.id, q, parseInt(limit) || 10);
    successResponse(res, plans, 'Search completed successfully');
  })

  /**
   * Compare plans
   */
  comparePlans = asyncHandler(async (req, res) => {
    const { planIds } = req.body;
    const comparison = await subscriptionPlanService.comparePlans(req.user.id, planIds);
    
    // Add feature comparison
    const featuresComparison = subscriptionPlanService.getPlanFeaturesComparison(comparison);
    
    successResponse(res, {
      plans: comparison,
      featuresComparison
    }, 'Plan comparison completed successfully');
  })
}

module.exports = new SubscriptionPlanController();