const prisma = require('../config/database');
const { ValidationError } = require('../utils/errorTypes');

class DashboardService {
  /**
   * Get main dashboard data
   */
  async getDashboardData(userId, options = {}) {
    const { period = 'month', compareWith, includeForecasting = false } = options;

    const periodDates = this.getPeriodDates(period);
    const compareDates = compareWith ? this.getComparePeriodDates(period, compareWith) : null;

    const [
      revenueData,
      invoiceData,
      paymentData,
      customerData,
      overdueData,
      recentActivity
    ] = await Promise.all([
      this.getRevenueMetrics(userId, periodDates, compareDates),
      this.getInvoiceMetrics(userId, periodDates, compareDates),
      this.getPaymentMetrics(userId, periodDates, compareDates),
      this.getCustomerMetrics(userId, periodDates),
      this.getOverdueMetrics(userId),
      this.getRecentActivity(userId, 10)
    ]);

    let forecastData = null;
    if (includeForecasting) {
      forecastData = await this.getRevenueForecast(userId, periodDates);
    }

    return {
      period,
      dateRange: periodDates,
      metrics: {
        revenue: revenueData,
        invoices: invoiceData,
        payments: paymentData,
        customers: customerData,
        overdue: overdueData
      },
      recentActivity,
      ...(forecastData && { forecast: forecastData })
    };
  }

  /**
   * Get revenue metrics for dashboard
   */
  async getRevenueMetrics(userId, periodDates, compareDates = null) {
    const currentRevenue = await prisma.invoice.aggregate({
      where: {
        userId,
        invoiceDate: {
          gte: periodDates.start,
          lte: periodDates.end
        },
        status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] }
      },
      _sum: { totalAmount: true },
      _count: true
    });

    let previousRevenue = null;
    let growth = null;

    if (compareDates) {
      previousRevenue = await prisma.invoice.aggregate({
        where: {
          userId,
          invoiceDate: {
            gte: compareDates.start,
            lte: compareDates.end
          },
          status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] }
        },
        _sum: { totalAmount: true }
      });

      const current = currentRevenue._sum.totalAmount || 0;
      const previous = previousRevenue._sum.totalAmount || 0;
      
      if (previous > 0) {
        growth = ((current - previous) / previous) * 100;
      }
    }

    return {
      total: currentRevenue._sum.totalAmount || 0,
      count: currentRevenue._count,
      ...(growth !== null && { growth: Math.round(growth * 100) / 100 }),
      ...(previousRevenue && { previous: previousRevenue._sum.totalAmount || 0 })
    };
  }

  /**
   * Get invoice metrics for dashboard
   */
  async getInvoiceMetrics(userId, periodDates, compareDates = null) {
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      where: {
        userId,
        invoiceDate: {
          gte: periodDates.start,
          lte: periodDates.end
        }
      },
      _count: true,
      _sum: { totalAmount: true }
    });

    const metrics = {
      total: 0,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      totalValue: 0
    };

    invoiceStats.forEach(stat => {
      metrics.total += stat._count;
      metrics.totalValue += stat._sum.totalAmount || 0;
      
      switch (stat.status) {
        case 'DRAFT':
          metrics.draft = stat._count;
          break;
        case 'SENT':
          metrics.sent = stat._count;
          break;
        case 'PAID':
          metrics.paid = stat._count;
          break;
        case 'OVERDUE':
          metrics.overdue = stat._count;
          break;
      }
    });

    return metrics;
  }

  /**
   * Get payment metrics for dashboard
   */
  async getPaymentMetrics(userId, periodDates, compareDates = null) {
    const paymentStats = await prisma.payment.aggregate({
      where: {
        userId,
        paymentDate: {
          gte: periodDates.start,
          lte: periodDates.end
        }
      },
      _sum: { amount: true },
      _count: true
    });

    const paymentMethods = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        userId,
        paymentDate: {
          gte: periodDates.start,
          lte: periodDates.end
        }
      },
      _count: true,
      _sum: { amount: true }
    });

    const methodBreakdown = {};
    paymentMethods.forEach(method => {
      methodBreakdown[method.paymentMethod] = {
        count: method._count,
        amount: method._sum.amount || 0
      };
    });

    return {
      total: paymentStats._sum.amount || 0,
      count: paymentStats._count,
      byMethod: methodBreakdown
    };
  }

  /**
   * Get customer metrics for dashboard
   */
  async getCustomerMetrics(userId, periodDates) {
    const [totalCustomers, newCustomers, activeCustomers] = await Promise.all([
      prisma.customer.count({ where: { userId, isActive: true } }),
      prisma.customer.count({
        where: {
          userId,
          createdAt: {
            gte: periodDates.start,
            lte: periodDates.end
          }
        }
      }),
      prisma.customer.count({
        where: {
          userId,
          isActive: true,
          invoices: {
            some: {
              invoiceDate: {
                gte: periodDates.start,
                lte: periodDates.end
              }
            }
          }
        }
      })
    ]);

    return {
      total: totalCustomers,
      new: newCustomers,
      active: activeCustomers
    };
  }

  /**
   * Get overdue metrics
   */
  async getOverdueMetrics(userId) {
    const overdueInvoices = await prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: ['SENT', 'PARTIAL_PAID'] },
        dueDate: { lt: new Date() }
      },
      _count: true,
      _sum: { balanceAmount: true }
    });

    return {
      count: overdueInvoices._count,
      amount: overdueInvoices._sum.balanceAmount || 0
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(userId, limit = 10) {
    const recentInvoices = await prisma.invoice.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        customer: {
          select: { name: true }
        }
      }
    });

    const recentPayments = await prisma.payment.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        customer: {
          select: { name: true }
        },
        invoice: {
          select: { invoiceNumber: true }
        }
      }
    });

    return {
      invoices: recentInvoices,
      payments: recentPayments
    };
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(userId, periodDates) {
    // Get historical data for trend analysis
    const historicalData = await prisma.invoice.groupBy({
      by: ['invoiceDate'],
      where: {
        userId,
        status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] },
        invoiceDate: {
          gte: new Date(periodDates.start.getTime() - (365 * 24 * 60 * 60 * 1000)), // Last year
          lte: periodDates.end
        }
      },
      _sum: { totalAmount: true }
    });

    // Simple linear regression for forecasting
    const monthlyData = this.aggregateByMonth(historicalData);
    const forecast = this.calculateLinearForecast(monthlyData, 3);

    return {
      historical: monthlyData.slice(-12), // Last 12 months
      forecast: forecast
    };
  }

  /**
   * Helper methods
   */
  getPeriodDates(period) {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const weekStart = now.getDate() - now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), weekStart);
        end = new Date(now.getFullYear(), now.getMonth(), weekStart + 6, 23, 59, 59);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterMonth, 1);
        end = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        throw new ValidationError('Invalid period specified');
    }

    return { start, end };
  }

  getComparePeriodDates(period, compareWith) {
    const currentDates = this.getPeriodDates(period);
    const diffMs = currentDates.end.getTime() - currentDates.start.getTime();

    if (compareWith === 'previous') {
      return {
        start: new Date(currentDates.start.getTime() - diffMs),
        end: new Date(currentDates.start.getTime() - 1)
      };
    } else if (compareWith === 'lastYear') {
      return {
        start: new Date(currentDates.start.getFullYear() - 1, currentDates.start.getMonth(), currentDates.start.getDate()),
        end: new Date(currentDates.end.getFullYear() - 1, currentDates.end.getMonth(), currentDates.end.getDate())
      };
    }

    return null;
  }

  aggregateByMonth(data) {
    const monthlyData = {};
    
    data.forEach(record => {
      const date = new Date(record.invoiceDate);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += record._sum.totalAmount || 0;
    });

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  calculateLinearForecast(data, periods) {
    if (data.length < 2) return [];

    // Simple linear regression
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.amount);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const nextX = n + i;
      const predictedY = slope * nextX + intercept;
      
      const lastDate = new Date(data[data.length - 1].month + '-01');
      const forecastDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, 1);
      const forecastMonth = `${forecastDate.getFullYear()}-${(forecastDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      forecast.push({
        month: forecastMonth,
        amount: Math.max(0, Math.round(predictedY))
      });
    }

    return forecast;
  }
}

module.exports = new DashboardService();