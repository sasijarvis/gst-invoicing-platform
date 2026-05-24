const prisma = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errorTypes');

class SubscriptionPlanService {
  /**
   * Get all subscription plans
   */
  async getAllPlans(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      isActive,
      type,
      billingCycle,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const where = {
      userId,
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(type && { type }),
      ...(billingCycle && { billingCycle })
    };

    const [plans, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { subscriptions: true }
          }
        }
      }),
      prisma.subscriptionPlan.count({ where })
    ]);

    return {
      plans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get plan statistics
   */
  async getPlanStatistics(userId) {
    const [totalPlans, activePlans, totalSubscriptions] = await Promise.all([
      prisma.subscriptionPlan.count({ where: { userId } }),
      prisma.subscriptionPlan.count({ where: { userId, isActive: true } }),
      prisma.subscription.count({
        where: {
          plan: { userId },
          status: { in: ['TRIAL', 'ACTIVE'] }
        }
      })
    ]);

    // Get plan type distribution
    const plansByType = await prisma.subscriptionPlan.groupBy({
      by: ['type'],
      where: { userId, isActive: true },
      _count: true
    });

    // Get billing cycle distribution
    const plansByBillingCycle = await prisma.subscriptionPlan.groupBy({
      by: ['billingCycle'],
      where: { userId, isActive: true },
      _count: true
    });

    // Get revenue by plan
    const revenueByPlan = await prisma.subscriptionPlan.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        price: true,
        billingCycle: true,
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    const planRevenue = revenueByPlan.map(plan => ({
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      billingCycle: plan.billingCycle,
      activeSubscriptions: plan._count.subscriptions,
      estimatedMonthlyRevenue: this.calculateMonthlyRevenue(plan.price, plan.billingCycle, plan._count.subscriptions)
    }));

    return {
      totalPlans,
      activePlans,
      inactivePlans: totalPlans - activePlans,
      totalActiveSubscriptions: totalSubscriptions,
      plansByType: plansByType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      plansByBillingCycle: plansByBillingCycle.reduce((acc, item) => {
        acc[item.billingCycle] = item._count;
        return acc;
      }, {}),
      revenueBreakdown: planRevenue,
      totalEstimatedMonthlyRevenue: planRevenue.reduce((sum, plan) => sum + plan.estimatedMonthlyRevenue, 0)
    };
  }

  /**
   * Get plan by ID
   */
  async getPlanById(userId, planId) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, userId },
      include: {
        subscriptions: {
          where: { status: { in: ['TRIAL', 'ACTIVE', 'PAUSED'] } },
          include: {
            customer: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    if (!plan) {
      throw new NotFoundError('Subscription plan not found');
    }

    return plan;
  }

  /**
   * Create new subscription plan
   */
  async createPlan(userId, planData) {
    // Check if plan with same name exists
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { userId, name: planData.name }
    });

    if (existingPlan) {
      throw new ValidationError('A plan with this name already exists');
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        ...planData,
        userId
      }
    });

    return plan;
  }

  /**
   * Update subscription plan
   */
  async updatePlan(userId, planId, updateData) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, userId }
    });

    if (!existingPlan) {
      throw new NotFoundError('Subscription plan not found');
    }

    // Check if name is being updated and already exists
    if (updateData.name && updateData.name !== existingPlan.name) {
      const nameExists = await prisma.subscriptionPlan.findFirst({
        where: { userId, name: updateData.name, id: { not: planId } }
      });

      if (nameExists) {
        throw new ValidationError('A plan with this name already exists');
      }
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateData
    });

    return updatedPlan;
  }

  /**
   * Delete subscription plan
   */
  async deletePlan(userId, planId) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, userId },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    if (!plan) {
      throw new NotFoundError('Subscription plan not found');
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        planId,
        status: { in: ['TRIAL', 'ACTIVE', 'PAUSED'] }
      }
    });

    if (activeSubscriptions > 0) {
      // Soft delete - mark as inactive instead of deleting
      await prisma.subscriptionPlan.update({
        where: { id: planId },
        data: { isActive: false }
      });

      return {
        message: 'Plan has active subscriptions and has been marked as inactive',
        type: 'soft_delete',
        activeSubscriptions
      };
    }

    // Hard delete if no active subscriptions
    await prisma.subscriptionPlan.delete({
      where: { id: planId }
    });

    return {
      message: 'Plan deleted successfully',
      type: 'hard_delete'
    };
  }

  /**
   * Get popular plans
   */
  async getPopularPlans(userId, limit = 5) {
    const popularPlans = await prisma.subscriptionPlan.findMany({
      where: { userId, isActive: true },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      },
      orderBy: {
        subscriptions: {
          _count: 'desc'
        }
      },
      take: limit
    });

    return popularPlans.map(plan => ({
      ...plan,
      subscriberCount: plan._count.subscriptions,
      estimatedMonthlyRevenue: this.calculateMonthlyRevenue(plan.price, plan.billingCycle, plan._count.subscriptions)
    }));
  }

  /**
   * Search plans
   */
  async searchPlans(userId, query, limit = 10) {
    if (!query || query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { type: { contains: query } }
        ]
      },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      },
      take: limit,
      orderBy: { name: 'asc' }
    });

    return plans;
  }

  /**
   * Compare plans
   */
  async comparePlans(userId, planIds) {
    if (!planIds || planIds.length < 2) {
      throw new ValidationError('At least 2 plan IDs are required for comparison');
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        userId,
        id: { in: planIds }
      },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    if (plans.length !== planIds.length) {
      throw new NotFoundError('One or more plans not found');
    }

    return plans.map(plan => ({
      ...plan,
      subscriberCount: plan._count.subscriptions,
      estimatedMonthlyRevenue: this.calculateMonthlyRevenue(plan.price, plan.billingCycle, plan._count.subscriptions)
    }));
  }

  /**
   * Helper method to calculate monthly revenue
   */
  calculateMonthlyRevenue(price, billingCycle, subscriberCount) {
    const multipliers = {
      MONTHLY: 1,
      QUARTERLY: 1 / 3,
      HALF_YEARLY: 1 / 6,
      YEARLY: 1 / 12
    };

    return price * (multipliers[billingCycle] || 1) * subscriberCount;
  }

  /**
   * Get plan features comparison
   */
  getPlanFeaturesComparison(plans) {
    const allFeatures = new Set();
    
    // Collect all unique features
    plans.forEach(plan => {
      if (plan.features) {
        Object.keys(plan.features).forEach(feature => allFeatures.add(feature));
      }
    });

    return {
      features: Array.from(allFeatures),
      comparison: plans.map(plan => ({
        planId: plan.id,
        planName: plan.name,
        features: Object.fromEntries(
          Array.from(allFeatures).map(feature => [
            feature,
            plan.features?.[feature] ?? null
          ])
        )
      }))
    };
  }
}

module.exports = new SubscriptionPlanService();