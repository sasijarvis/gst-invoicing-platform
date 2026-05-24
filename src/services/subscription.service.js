const prisma = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errorTypes');

class SubscriptionService {
  /**
   * Get all subscriptions
   */
  async getAllSubscriptions(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      planId,
      customerId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const where = {
      plan: { userId },
      ...(status && { status }),
      ...(planId && { planId }),
      ...(customerId && { customerId })
    };

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true }
          },
          plan: {
            select: { id: true, name: true, type: true, price: true, billingCycle: true }
          }
        }
      }),
      prisma.subscription.count({ where })
    ]);

    return {
      subscriptions,
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
   * Get subscription statistics
   */
  async getSubscriptionStatistics(userId) {
    const baseWhere = { plan: { userId } };

    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      pausedSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions
    ] = await Promise.all([
      prisma.subscription.count({ where: baseWhere }),
      prisma.subscription.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { ...baseWhere, status: 'TRIAL' } }),
      prisma.subscription.count({ where: { ...baseWhere, status: 'PAUSED' } }),
      prisma.subscription.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
      prisma.subscription.count({ where: { ...baseWhere, status: 'EXPIRED' } })
    ]);

    // Get revenue statistics
    const revenueStats = await this.getRevenueStatistics(userId);

    // Get subscription trends (last 12 months)
    const trends = await this.getSubscriptionTrends(userId);

    // Get expiring subscriptions (next 30 days)
    const expiringSubscriptions = await this.getExpiringSubscriptions(userId, 30);

    return {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      pausedSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      revenue: revenueStats,
      trends,
      expiringSubscriptions: expiringSubscriptions.length,
      healthScore: this.calculateHealthScore({
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        cancelled: cancelledSubscriptions
      })
    };
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(userId, subscriptionId) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        plan: { userId }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gstNumber: true,
            address: true,
            city: true,
            state: true
          }
        },
        plan: true,
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            totalAmount: true,
            status: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    // Calculate subscription metrics
    const metrics = await this.calculateSubscriptionMetrics(subscription);

    return {
      ...subscription,
      metrics
    };
  }

  /**
   * Create new subscription
   */
  async createSubscription(userId, subscriptionData) {
    const { customerId, planId, startDate, useTrialPeriod, ...otherData } = subscriptionData;

    // Verify customer belongs to user
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify plan belongs to user
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, userId, isActive: true }
    });

    if (!plan) {
      throw new NotFoundError('Subscription plan not found or inactive');
    }

    // Check for existing active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        customerId,
        status: { in: ['TRIAL', 'ACTIVE', 'PAUSED'] }
      }
    });

    if (existingSubscription) {
      throw new ValidationError('Customer already has an active subscription');
    }

    // Calculate subscription details
    const subscriptionStart = new Date(startDate);
    const trialEndDate = useTrialPeriod && plan.trialDays > 0 
      ? new Date(subscriptionStart.getTime() + (plan.trialDays * 24 * 60 * 60 * 1000))
      : null;
    
    const status = trialEndDate ? 'TRIAL' : 'ACTIVE';
    const currentPeriodStart = trialEndDate || subscriptionStart;
    const currentPeriodEnd = this.calculateNextBillingDate(currentPeriodStart, plan.billingCycle);

    const subscription = await prisma.subscription.create({
      data: {
        customerId,
        planId,
        status,
        startDate: subscriptionStart,
        trialEndDate,
        currentPeriodStart,
        currentPeriodEnd,
        ...otherData
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        plan: {
          select: { id: true, name: true, price: true, billingCycle: true }
        }
      }
    });

    return subscription;
  }

  /**
   * Update subscription
   */
  async updateSubscription(userId, subscriptionId, updateData) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        plan: { userId }
      }
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    // If updating plan, verify new plan exists
    if (updateData.planId) {
      const newPlan = await prisma.subscriptionPlan.findFirst({
        where: { id: updateData.planId, userId, isActive: true }
      });

      if (!newPlan) {
        throw new NotFoundError('New subscription plan not found or inactive');
      }
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        plan: {
          select: { id: true, name: true, price: true, billingCycle: true }
        }
      }
    });

    return updatedSubscription;
  }

  /**
   * Upgrade/Downgrade subscription plan
   */
  async upgradePlan(userId, subscriptionId, upgradeData) {
    const { newPlanId, effectiveDate, prorationMethod, applyProration, notes } = upgradeData;

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        plan: { userId }
      },
      include: { plan: true }
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new ValidationError('Only active subscriptions can be upgraded');
    }

    const newPlan = await prisma.subscriptionPlan.findFirst({
      where: { id: newPlanId, userId, isActive: true }
    });

    if (!newPlan) {
      throw new NotFoundError('New subscription plan not found or inactive');
    }

    const upgradeDate = new Date(effectiveDate);
    const prorationAmount = applyProration 
      ? this.calculateProration(subscription, newPlan, upgradeDate, prorationMethod)
      : 0;

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
        ...(prorationMethod === 'IMMEDIATE' && {
          currentPeriodStart: upgradeDate,
          currentPeriodEnd: this.calculateNextBillingDate(upgradeDate, newPlan.billingCycle)
        })
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        plan: {
          select: { id: true, name: true, price: true, billingCycle: true }
        }
      }
    });

    return {
      subscription: updatedSubscription,
      prorationAmount,
      upgradeDate,
      notes: notes || `Plan upgraded from ${subscription.plan.name} to ${newPlan.name}`
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, subscriptionId, cancellationData) {
    const { cancellationType, customDate, reason, notes, refundAmount } = cancellationData;

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        plan: { userId }
      },
      include: { plan: true }
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.status === 'CANCELLED') {
      throw new ValidationError('Subscription is already cancelled');
    }

    let cancellationDate;
    let status = 'CANCELLED';

    switch (cancellationType) {
      case 'IMMEDIATE':
        cancellationDate = new Date();
        break;
      case 'END_OF_CYCLE':
        cancellationDate = subscription.currentPeriodEnd;
        status = 'ACTIVE'; // Keep active until end of cycle
        break;
      case 'CUSTOM_DATE':
        cancellationDate = new Date(customDate);
        status = cancellationDate <= new Date() ? 'CANCELLED' : 'ACTIVE';
        break;
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        cancelledAt: new Date(),
        endDate: cancellationDate,
        cancellationReason: reason,
        autoRenew: false
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        plan: {
          select: { id: true, name: true, price: true, billingCycle: true }
        }
      }
    });

    return {
      subscription: updatedSubscription,
      cancellationDate,
      refundAmount: refundAmount || 0,
      notes: notes || `Subscription cancelled - ${reason}`
    };
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(userId, subscriptionId, reactivationData = {}) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        plan: { userId }
      },
      include: { plan: true }
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (!['CANCELLED', 'PAUSED', 'EXPIRED'].includes(subscription.status)) {
      throw new ValidationError('Only cancelled, paused, or expired subscriptions can be reactivated');
    }

    const reactivationDate = new Date();
    const newPeriodEnd = this.calculateNextBillingDate(reactivationDate, subscription.plan.billingCycle);

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: reactivationDate,
        currentPeriodEnd: newPeriodEnd,
        cancelledAt: null,
        endDate: null,
        cancellationReason: null,
        autoRenew: true,
        ...reactivationData
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        plan: {
          select: { id: true, name: true, price: true, billingCycle: true }
        }
      }
    });

    return updatedSubscription;
  }

  /**
   * Get expiring subscriptions
   */
  async getExpiringSubscriptions(userId, days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await prisma.subscription.findMany({
      where: {
        plan: { userId },
        status: { in: ['ACTIVE', 'TRIAL'] },
        currentPeriodEnd: {
          lte: futureDate,
          gte: new Date()
        }
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        plan: {
          select: { id: true, name: true, price: true, billingCycle: true }
        }
      },
      orderBy: { currentPeriodEnd: 'asc' }
    });
  }

  /**
   * Helper methods
   */
  calculateNextBillingDate(startDate, billingCycle) {
    const date = new Date(startDate);
    
    switch (billingCycle) {
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'HALF_YEARLY':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date;
  }

  calculateProration(subscription, newPlan, upgradeDate, prorationMethod) {
    // Simplified proration calculation
    const daysInPeriod = Math.ceil((subscription.currentPeriodEnd - subscription.currentPeriodStart) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((subscription.currentPeriodEnd - upgradeDate) / (1000 * 60 * 60 * 24));
    
    const priceDifference = newPlan.price - subscription.plan.price;
    return (priceDifference * daysRemaining) / daysInPeriod;
  }

  async calculateSubscriptionMetrics(subscription) {
    const totalPaid = await prisma.invoice.aggregate({
      where: {
        customerId: subscription.customerId,
        status: 'PAID'
      },
      _sum: { totalAmount: true }
    });

    const daysActive = Math.ceil((new Date() - subscription.startDate) / (1000 * 60 * 60 * 24));

    return {
      totalPaid: totalPaid._sum.totalAmount || 0,
      daysActive,
      isInTrial: subscription.status === 'TRIAL',
      daysUntilRenewal: subscription.currentPeriodEnd 
        ? Math.ceil((subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24))
        : null
    };
  }

  async getRevenueStatistics(userId) {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        plan: { userId },
        status: { in: ['ACTIVE', 'TRIAL'] }
      },
      include: { plan: true }
    });

    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
      const multipliers = { MONTHLY: 1, QUARTERLY: 1/3, HALF_YEARLY: 1/6, YEARLY: 1/12 };
      return sum + (sub.customPrice || sub.plan.price) * (multipliers[sub.plan.billingCycle] || 1);
    }, 0);

    return {
      monthlyRecurringRevenue,
      annualRecurringRevenue: monthlyRecurringRevenue * 12,
      averageRevenuePerUser: activeSubscriptions.length > 0 ? monthlyRecurringRevenue / activeSubscriptions.length : 0
    };
  }

  async getSubscriptionTrends(userId) {
    // Get subscription creation trends for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const trends = await prisma.subscription.groupBy({
      by: ['createdAt'],
      where: {
        plan: { userId },
        createdAt: { gte: twelveMonthsAgo }
      },
      _count: true
    });

    // Group by month
    const monthlyTrends = {};
    trends.forEach(trend => {
      const month = trend.createdAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyTrends[month] = (monthlyTrends[month] || 0) + trend._count;
    });

    return monthlyTrends;
  }

  calculateHealthScore(stats) {
    const { total, active, trial, cancelled } = stats;
    if (total === 0) return 0;

    const activeRate = (active + trial) / total;
    const churnRate = cancelled / total;
    
    return Math.round((activeRate * 70 + (1 - churnRate) * 30) * 100);
  }
}

module.exports = new SubscriptionService();