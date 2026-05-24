const prisma = require('../config/database');
const { ValidationError } = require('../utils/errorTypes');

class AnalyticsService {
  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(userId, options = {}) {
    const {
      startDate,
      endDate,
      customerId,
      metrics = ['revenue', 'invoices', 'payments'],
      limit = 10
    } = options;

    const where = {
      userId,
      ...(customerId && { id: customerId })
    };

    const dateFilter = {
      invoiceDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    const customers = await prisma.customer.findMany({
      where: {
        ...where,
        invoices: {
          some: dateFilter
        }
      },
      take: customerId ? 1 : parseInt(limit) || 10,
      include: {
        _count: {
          select: {
            invoices: true,
            payments: true
          }
        }
      }
    });

    const analyticsData = [];

    for (const customer of customers) {
      const customerData = {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          state: customer.state,
          gstNumber: customer.gstNumber
        },
        metrics: {}
      };

      if (metrics.includes('revenue')) {
        const revenue = await prisma.invoice.aggregate({
          where: {
            customerId: customer.id,
            ...dateFilter,
            status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] }
          },
          _sum: { totalAmount: true },
          _avg: { totalAmount: true }
        });

        customerData.metrics.revenue = {
          total: revenue._sum.totalAmount || 0,
          average: revenue._avg.totalAmount || 0
        };
      }

      if (metrics.includes('invoices')) {
        const invoiceStats = await prisma.invoice.groupBy({
          by: ['status'],
          where: {
            customerId: customer.id,
            ...dateFilter
          },
          _count: true,
          _sum: { totalAmount: true }
        });

        const invoiceMetrics = {
          total: 0,
          byStatus: {}
        };

        invoiceStats.forEach(stat => {
          invoiceMetrics.total += stat._count;
          invoiceMetrics.byStatus[stat.status] = {
            count: stat._count,
            amount: stat._sum.totalAmount || 0
          };
        });

        customerData.metrics.invoices = invoiceMetrics;
      }

      if (metrics.includes('payments')) {
        const paymentStats = await prisma.payment.aggregate({
          where: {
            customerId: customer.id,
            paymentDate: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          },
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true }
        });

        const paymentMethods = await prisma.payment.groupBy({
          by: ['paymentMethod'],
          where: {
            customerId: customer.id,
            paymentDate: {
              gte: new Date(startDate),
              lte: new Date(endDate)
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

        customerData.metrics.payments = {
          total: paymentStats._sum.amount || 0,
          count: paymentStats._count,
          average: paymentStats._avg.amount || 0,
          byMethod: methodBreakdown
        };
      }

      if (metrics.includes('outstanding')) {
        const outstanding = await prisma.invoice.aggregate({
          where: {
            customerId: customer.id,
            status: { in: ['SENT', 'PARTIAL_PAID'] },
            balanceAmount: { gt: 0 }
          },
          _sum: { balanceAmount: true },
          _count: true
        });

        customerData.metrics.outstanding = {
          amount: outstanding._sum.balanceAmount || 0,
          invoices: outstanding._count
        };
      }

      if (metrics.includes('frequency')) {
        const frequency = await this.getCustomerFrequencyAnalysis(customer.id, startDate, endDate);
        customerData.metrics.frequency = frequency;
      }

      analyticsData.push(customerData);
    }

    // Sort by revenue if included in metrics
    if (metrics.includes('revenue')) {
      analyticsData.sort((a, b) => 
        (b.metrics.revenue?.total || 0) - (a.metrics.revenue?.total || 0)
      );
    }

    return analyticsData;
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(userId, options = {}) {
    const {
      startDate,
      endDate,
      productId,
      type,
      category,
      metrics = ['revenue', 'quantity'],
      limit = 10
    } = options;

    const where = {
      userId,
      ...(productId && { id: productId }),
      ...(type && { type }),
      ...(category && { category })
    };

    const dateFilter = {
      invoice: {
        invoiceDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] }
      }
    };

    // Get products that have invoice items in the date range
    const productIds = await prisma.invoiceItem.findMany({
      where: {
        ...dateFilter,
        product: where
      },
      select: { productId: true },
      distinct: ['productId']
    });

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds.map(item => item.productId) },
        ...where
      },
      take: productId ? 1 : parseInt(limit) || 10
    });

    const analyticsData = [];

    for (const product of products) {
      const productData = {
        product: {
          id: product.id,
          name: product.name,
          type: product.type,
          category: product.category,
          price: product.price,
          unit: product.unit
        },
        metrics: {}
      };

      const itemWhere = {
        productId: product.id,
        ...dateFilter
      };

      if (metrics.includes('revenue')) {
        const revenue = await prisma.invoiceItem.aggregate({
          where: itemWhere,
          _sum: {
            amount: true,
            taxAmount: true
          },
          _avg: { amount: true }
        });

        productData.metrics.revenue = {
          total: revenue._sum.amount || 0,
          tax: revenue._sum.taxAmount || 0,
          average: revenue._avg.amount || 0
        };
      }

      if (metrics.includes('quantity')) {
        const quantity = await prisma.invoiceItem.aggregate({
          where: itemWhere,
          _sum: { quantity: true },
          _avg: { quantity: true },
          _count: true
        });

        productData.metrics.quantity = {
          total: quantity._sum.quantity || 0,
          average: quantity._avg.quantity || 0,
          transactions: quantity._count
        };
      }

      if (metrics.includes('invoices')) {
        const invoices = await prisma.invoiceItem.groupBy({
          by: ['invoiceId'],
          where: itemWhere,
          _count: true
        });

        productData.metrics.invoices = {
          count: invoices.length
        };
      }

      if (metrics.includes('customers')) {
        const customers = await prisma.invoiceItem.findMany({
          where: itemWhere,
          select: {
            invoice: {
              select: { customerId: true }
            }
          },
          distinct: ['invoiceId']
        });

        const uniqueCustomers = new Set(customers.map(item => item.invoice.customerId));
        productData.metrics.customers = {
          count: uniqueCustomers.size
        };
      }

      analyticsData.push(productData);
    }

    // Sort by revenue if included in metrics
    if (metrics.includes('revenue')) {
      analyticsData.sort((a, b) => 
        (b.metrics.revenue?.total || 0) - (a.metrics.revenue?.total || 0)
      );
    }

    return analyticsData;
  }

  /**
   * Get trends analysis
   */
  async getTrendsAnalysis(userId, options = {}) {
    const {
      startDate,
      endDate,
      metric,
      granularity = 'month',
      includeForecast = false,
      forecastPeriods = 3
    } = options;

    const dateFilter = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };

    let data = [];

    switch (metric) {
      case 'revenue':
        data = await this.getRevenueTrends(userId, dateFilter, granularity);
        break;
      case 'invoices':
        data = await this.getInvoiceTrends(userId, dateFilter, granularity);
        break;
      case 'customers':
        data = await this.getCustomerTrends(userId, dateFilter, granularity);
        break;
      case 'products':
        data = await this.getProductTrends(userId, dateFilter, granularity);
        break;
      case 'payments':
        data = await this.getPaymentTrends(userId, dateFilter, granularity);
        break;
      default:
        throw new ValidationError('Invalid metric specified');
    }

    let forecast = null;
    if (includeForecast && data.length >= 2) {
      forecast = this.calculateForecast(data, forecastPeriods, granularity);
    }

    return {
      metric,
      granularity,
      period: { startDate, endDate },
      data,
      ...(forecast && { forecast })
    };
  }

  /**
   * Helper methods for trends analysis
   */
  async getRevenueTrends(userId, dateFilter, granularity) {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: dateFilter,
        status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] }
      },
      select: {
        invoiceDate: true,
        totalAmount: true,
        taxAmount: true,
        subtotal: true
      },
      orderBy: { invoiceDate: 'asc' }
    });

    return this.groupDataByPeriod(invoices, granularity, 'invoiceDate', [
      { field: 'totalAmount', name: 'revenue' },
      { field: 'taxAmount', name: 'tax' },
      { field: 'subtotal', name: 'net' }
    ]);
  }

  async getInvoiceTrends(userId, dateFilter, granularity) {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: dateFilter
      },
      select: {
        invoiceDate: true,
        status: true
      },
      orderBy: { invoiceDate: 'asc' }
    });

    return this.groupDataByPeriod(invoices, granularity, 'invoiceDate', [
      { count: true, name: 'total' }
    ], true);
  }

  async getCustomerTrends(userId, dateFilter, granularity) {
    const customers = await prisma.customer.findMany({
      where: {
        userId,
        createdAt: dateFilter
      },
      select: {
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return this.groupDataByPeriod(customers, granularity, 'createdAt', [
      { count: true, name: 'newCustomers' }
    ], true);
  }

  async getProductTrends(userId, dateFilter, granularity) {
    const products = await prisma.product.findMany({
      where: {
        userId,
        createdAt: dateFilter
      },
      select: {
        createdAt: true,
        type: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return this.groupDataByPeriod(products, granularity, 'createdAt', [
      { count: true, name: 'newProducts' }
    ], true);
  }

  async getPaymentTrends(userId, dateFilter, granularity) {
    const payments = await prisma.payment.findMany({
      where: {
        userId,
        paymentDate: dateFilter
      },
      select: {
        paymentDate: true,
        amount: true
      },
      orderBy: { paymentDate: 'asc' }
    });

    return this.groupDataByPeriod(payments, granularity, 'paymentDate', [
      { field: 'amount', name: 'amount' },
      { count: true, name: 'count' }
    ], true);
  }

  groupDataByPeriod(data, granularity, dateField, aggregations, includeCount = false) {
    const grouped = {};

    data.forEach(item => {
      const key = this.formatDateKey(item[dateField], granularity);
      
      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          ...(includeCount && { count: 0 })
        };
        
        aggregations.forEach(agg => {
          if (agg.count) {
            grouped[key][agg.name] = 0;
          } else {
            grouped[key][agg.name] = 0;
          }
        });
      }

      if (includeCount) {
        grouped[key].count++;
      }

      aggregations.forEach(agg => {
        if (agg.count) {
          grouped[key][agg.name]++;
        } else if (agg.field) {
          grouped[key][agg.name] += item[agg.field] || 0;
        }
      });
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }

  formatDateKey(date, granularity) {
    const d = new Date(date);
    switch (granularity) {
      case 'day':
        return d.toISOString().split('T')[0];
      case 'week':
        const week = this.getWeekNumber(d);
        return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`;
      case 'month':
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  calculateForecast(data, periods, granularity) {
    if (data.length < 2) return [];

    // Simple linear regression for the primary metric
    const values = data.map(d => d.revenue || d.amount || d.count || d.total || 0);
    const n = values.length;
    const x = values.map((_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const nextX = n + i;
      const predictedY = slope * nextX + intercept;
      
      const lastPeriod = data[data.length - 1].period;
      const nextPeriod = this.getNextPeriod(lastPeriod, granularity, i + 1);
      
      forecast.push({
        period: nextPeriod,
        predicted: Math.max(0, Math.round(predictedY * 100) / 100),
        confidence: Math.max(0.3, 1 - (i * 0.2)) // Decreasing confidence
      });
    }

    return forecast;
  }

  getNextPeriod(currentPeriod, granularity, increment) {
    const [year, monthOrWeek] = currentPeriod.split('-');
    
    switch (granularity) {
      case 'month':
        const month = parseInt(monthOrWeek) + increment;
        const newYear = parseInt(year) + Math.floor((month - 1) / 12);
        const newMonth = ((month - 1) % 12) + 1;
        return `${newYear}-${newMonth.toString().padStart(2, '0')}`;
      
      case 'week':
        const week = parseInt(monthOrWeek.substring(1)) + increment;
        const newWeekYear = parseInt(year);
        return `${newWeekYear}-W${week.toString().padStart(2, '0')}`;
      
      default:
        const date = new Date(currentPeriod);
        date.setDate(date.getDate() + increment);
        return date.toISOString().split('T')[0];
    }
  }

  async getCustomerFrequencyAnalysis(customerId, startDate, endDate) {
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        invoiceDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: { invoiceDate: true },
      orderBy: { invoiceDate: 'asc' }
    });

    if (invoices.length < 2) {
      return {
        frequency: 'Insufficient data',
        averageDaysBetween: null,
        totalInvoices: invoices.length
      };
    }

    const intervals = [];
    for (let i = 1; i < invoices.length; i++) {
      const diff = (new Date(invoices[i].invoiceDate) - new Date(invoices[i-1].invoiceDate)) / (1000 * 60 * 60 * 24);
      intervals.push(diff);
    }

    const averageDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    let frequency;
    if (averageDays <= 7) frequency = 'Weekly';
    else if (averageDays <= 14) frequency = 'Bi-weekly';
    else if (averageDays <= 35) frequency = 'Monthly';
    else if (averageDays <= 100) frequency = 'Quarterly';
    else frequency = 'Irregular';

    return {
      frequency,
      averageDaysBetween: Math.round(averageDays),
      totalInvoices: invoices.length
    };
  }
}

module.exports = new AnalyticsService();