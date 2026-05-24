const prisma = require('../config/database');
const { ValidationError } = require('../utils/errorTypes');

class ReportsService {
  /**
   * Generate sales report
   */
  async getSalesReport(userId, options = {}) {
    const {
      startDate,
      endDate,
      groupBy = 'month',
      customerId,
      productId,
      status,
      includeDetails = false
    } = options;

    const where = {
      userId,
      invoiceDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      ...(customerId && { customerId }),
      ...(status && { status })
    };

    // Get summary data
    const summary = await prisma.invoice.aggregate({
      where,
      _sum: {
        subtotal: true,
        taxAmount: true,
        discountAmount: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true
      },
      _count: true,
      _avg: {
        totalAmount: true
      }
    });

    // Get grouped data by time period
    const groupedData = await this.getGroupedSalesData(userId, where, groupBy);

    // Get top customers and products
    const [topCustomers, topProducts] = await Promise.all([
      this.getTopCustomers(userId, where, 10),
      this.getTopProducts(userId, where, 10)
    ]);

    let details = null;
    if (includeDetails) {
      details = await prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, gstNumber: true }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, type: true }
              }
            }
          }
        }
      });
    }

    return {
      summary: {
        totalInvoices: summary._count,
        totalRevenue: summary._sum.totalAmount || 0,
        totalTax: summary._sum.taxAmount || 0,
        totalDiscount: summary._sum.discountAmount || 0,
        totalPaid: summary._sum.paidAmount || 0,
        totalOutstanding: summary._sum.balanceAmount || 0,
        averageInvoiceValue: summary._avg.totalAmount || 0
      },
      trends: groupedData,
      topCustomers,
      topProducts,
      ...(details && { details })
    };
  }

  /**
   * Generate GST report
   */
  async getGSTReport(userId, options = {}) {
    const {
      startDate,
      endDate,
      reportType = 'summary',
      state,
      includeZeroRated = true
    } = options;

    const where = {
      userId,
      invoiceDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] },
      ...(state && {
        customer: { state }
      })
    };

    if (!includeZeroRated) {
      where.taxAmount = { gt: 0 };
    }

    const gstSummary = await prisma.invoice.aggregate({
      where,
      _sum: {
        subtotal: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        taxAmount: true,
        totalAmount: true
      },
      _count: true
    });

    // Get state-wise breakdown - need to use customerId since we can't group by relation
    const stateWiseData = await prisma.invoice.groupBy({
      by: ['customerId'],
      where,
      _sum: {
        subtotal: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        taxAmount: true
      },
      _count: true
    });

    // Get customer details for the state-wise data
    const customerIds = stateWiseData.map(item => item.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, state: true, gstNumber: true }
    });

    // Map customer data to the grouped results
    const stateWiseWithCustomers = stateWiseData.map(item => {
      const customer = customers.find(c => c.id === item.customerId);
      return {
        customerId: item.customerId,
        customerName: customer?.name || 'Unknown',
        state: customer?.state || 'Unknown',
        gstNumber: customer?.gstNumber,
        subtotal: item._sum.subtotal || 0,
        cgstAmount: item._sum.cgstAmount || 0,
        sgstAmount: item._sum.sgstAmount || 0,
        igstAmount: item._sum.igstAmount || 0,
        taxAmount: item._sum.taxAmount || 0,
        invoiceCount: item._count
      };
    });

    // Get HSN/SAC wise data
    const hsnSacData = await this.getHSNSACWiseData(userId, where);

    // Get tax rate wise data
    const taxRateData = await this.getTaxRateWiseData(userId, where);

    let gstr1Data = null;
    let gstr3bData = null;

    if (reportType === 'GSTR1' || reportType === 'summary') {
      gstr1Data = await this.generateGSTR1Data(userId, where);
    }

    if (reportType === 'GSTR3B' || reportType === 'summary') {
      gstr3bData = await this.generateGSTR3BData(userId, where);
    }

    return {
      period: { startDate, endDate },
      summary: {
        totalInvoices: gstSummary._count,
        totalTaxableValue: gstSummary._sum.subtotal || 0,
        totalCGST: gstSummary._sum.cgstAmount || 0,
        totalSGST: gstSummary._sum.sgstAmount || 0,
        totalIGST: gstSummary._sum.igstAmount || 0,
        totalTax: gstSummary._sum.taxAmount || 0,
        totalValue: gstSummary._sum.totalAmount || 0
      },
      stateWise: stateWiseWithCustomers,
      hsnSacWise: hsnSacData,
      taxRateWise: taxRateData,
      ...(gstr1Data && { gstr1: gstr1Data }),
      ...(gstr3bData && { gstr3b: gstr3bData })
    };
  }

  /**
   * Generate aging report
   */
  async getAgingReport(userId, options = {}) {
    const {
      asOfDate = new Date(),
      customerId,
      includePaid = false,
      agingBuckets = [30, 60, 90, 120]
    } = options;

    const where = {
      userId,
      invoiceDate: { lte: new Date(asOfDate) },
      ...(customerId && { customerId }),
      ...(!includePaid && {
        status: { in: ['SENT', 'PARTIAL_PAID'] },
        balanceAmount: { gt: 0 }
      })
    };

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Calculate aging for each invoice
    const agingData = invoices.map(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const asOf = new Date(asOfDate);
      const daysPastDue = Math.floor((asOf - dueDate) / (1000 * 60 * 60 * 24));
      
      let agingBucket = 'Current';
      if (daysPastDue > 0) {
        for (let i = 0; i < agingBuckets.length; i++) {
          if (daysPastDue <= agingBuckets[i]) {
            agingBucket = `1-${agingBuckets[i]} days`;
            break;
          }
        }
        if (daysPastDue > agingBuckets[agingBuckets.length - 1]) {
          agingBucket = `${agingBuckets[agingBuckets.length - 1]}+ days`;
        }
      }

      return {
        ...invoice,
        daysPastDue: Math.max(0, daysPastDue),
        agingBucket
      };
    });

    // Group by aging buckets
    const bucketSummary = {};
    const bucketNames = ['Current', ...agingBuckets.map((bucket, i) => 
      i === 0 ? `1-${bucket} days` : `${agingBuckets[i-1]+1}-${bucket} days`
    ), `${agingBuckets[agingBuckets.length-1]}+ days`];

    bucketNames.forEach(bucket => {
      bucketSummary[bucket] = {
        count: 0,
        amount: 0
      };
    });

    agingData.forEach(invoice => {
      const bucket = invoice.agingBucket;
      bucketSummary[bucket].count++;
      bucketSummary[bucket].amount += invoice.balanceAmount;
    });

    return {
      asOfDate,
      summary: bucketSummary,
      details: agingData
    };
  }

  /**
   * Generate profit & loss report
   */
  async getProfitLossReport(userId, options = {}) {
    const {
      startDate,
      endDate,
      groupBy = 'month',
      includeRecurring = true
    } = options;

    const where = {
      userId,
      invoiceDate: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      status: { in: ['SENT', 'PAID', 'PARTIAL_PAID'] }
    };

    // Revenue from invoices
    const revenue = await prisma.invoice.aggregate({
      where,
      _sum: {
        subtotal: true,
        taxAmount: true,
        totalAmount: true
      }
    });

    // Group revenue by time period
    const revenueByPeriod = await this.getGroupedSalesData(userId, where, groupBy);

    // Product/Service breakdown - group by productId instead of product relation
    const revenueByType = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: where
      },
      _sum: {
        amount: true,
        taxAmount: true
      }
    });

    // Get product details for the breakdown
    const productIds = revenueByType.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { 
        id: true, 
        name: true, 
        type: true,
        category: true
      }
    });

    // Map product data to the grouped results
    const revenueByTypeWithProducts = revenueByType.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        productType: product?.type || 'UNKNOWN',
        category: product?.category,
        amount: item._sum.amount || 0,
        taxAmount: item._sum.taxAmount || 0
      };
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalRevenue: revenue._sum.totalAmount || 0,
        netRevenue: revenue._sum.subtotal || 0,
        totalTax: revenue._sum.taxAmount || 0,
        // Note: Expenses would need to be tracked separately
        grossProfit: revenue._sum.subtotal || 0,
        netProfit: revenue._sum.subtotal || 0
      },
      trends: revenueByPeriod,
      breakdown: {
        byType: revenueByTypeWithProducts
      }
    };
  }

  /**
   * Helper methods
   */
  async getGroupedSalesData(userId, baseWhere, groupBy) {
    // Fetch data and group it manually since Prisma doesn't support custom date grouping easily
    const invoices = await prisma.invoice.findMany({
      where: baseWhere,
      select: {
        invoiceDate: true,
        totalAmount: true,
        taxAmount: true,
        subtotal: true
      },
      orderBy: { invoiceDate: 'asc' }
    });

    const grouped = {};
    invoices.forEach(invoice => {
      const key = this.formatDateKey(invoice.invoiceDate, groupBy);
      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          count: 0,
          revenue: 0,
          tax: 0,
          net: 0
        };
      }
      grouped[key].count++;
      grouped[key].revenue += invoice.totalAmount || 0;
      grouped[key].tax += invoice.taxAmount || 0;
      grouped[key].net += invoice.subtotal || 0;
    });

    return Object.values(grouped);
  }

  async getTopCustomers(userId, baseWhere, limit) {
    return await prisma.customer.findMany({
      where: {
        userId,
        invoices: {
          some: baseWhere
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: { invoices: true }
        }
      },
      orderBy: {
        invoices: {
          _count: 'desc'
        }
      },
      take: limit
    });
  }

  async getTopProducts(userId, baseWhere, limit) {
    const topProducts = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: baseWhere
      },
      _sum: {
        amount: true,
        quantity: true
      },
      _count: true,
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: limit
    });

    // Get product details
    const productIds = topProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, type: true, category: true }
    });

    const productMap = products.reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {});

    return topProducts.map(item => ({
      product: productMap[item.productId],
      revenue: item._sum.amount,
      quantity: item._sum.quantity,
      invoices: item._count
    }));
  }

  async getHSNSACWiseData(userId, baseWhere) {
    // Group by productId since we can't group by relation
    const itemData = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: baseWhere
      },
      _sum: {
        amount: true,
        taxAmount: true,
        quantity: true
      },
      _count: true
    });

    // Get product details for HSN/SAC codes
    const productIds = itemData.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { 
        id: true, 
        name: true, 
        type: true, 
        hsnCode: true, 
        sacCode: true,
        category: true
      }
    });

    // Map product data to the grouped results
    return itemData.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        productType: product?.type || 'UNKNOWN',
        hsnCode: product?.hsnCode,
        sacCode: product?.sacCode,
        category: product?.category,
        hsnSacCode: product?.hsnCode || product?.sacCode || 'N/A',
        amount: item._sum.amount || 0,
        taxAmount: item._sum.taxAmount || 0,
        quantity: item._sum.quantity || 0,
        invoiceCount: item._count
      };
    });
  }

  async getTaxRateWiseData(userId, baseWhere) {
    return await prisma.invoiceItem.groupBy({
      by: ['taxRate'],
      where: {
        invoice: baseWhere
      },
      _sum: {
        amount: true,
        taxAmount: true
      },
      _count: true,
      orderBy: {
        taxRate: 'asc'
      }
    });
  }

  async generateGSTR1Data(userId, baseWhere) {
    // GSTR-1 specific calculations
    // This is a simplified version - actual GSTR-1 has many more sections
    const b2bData = await prisma.invoice.findMany({
      where: {
        ...baseWhere,
        customer: {
          gstNumber: { not: null }
        }
      },
      include: {
        customer: {
          select: { gstNumber: true, state: true, name: true }
        },
        items: {
          include: {
            product: {
              select: { hsnCode: true, sacCode: true }
            }
          }
        }
      }
    });

    const b2cData = await prisma.invoice.findMany({
      where: {
        ...baseWhere,
        customer: {
          gstNumber: null
        }
      },
      include: {
        customer: {
          select: { state: true }
        }
      }
    });

    return {
      b2b: b2bData,
      b2c: b2cData
    };
  }

  async generateGSTR3BData(userId, baseWhere) {
    // GSTR-3B specific calculations
    const outwardSupplies = await prisma.invoice.aggregate({
      where: baseWhere,
      _sum: {
        subtotal: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true
      }
    });

    return {
      outwardSupplies: {
        taxableValue: outwardSupplies._sum.subtotal || 0,
        cgst: outwardSupplies._sum.cgstAmount || 0,
        sgst: outwardSupplies._sum.sgstAmount || 0,
        igst: outwardSupplies._sum.igstAmount || 0
      }
    };
  }

  formatDateKey(date, groupBy) {
    const d = new Date(date);
    switch (groupBy) {
      case 'day':
        return d.toISOString().split('T')[0];
      case 'week':
        const week = this.getWeekNumber(d);
        return `${d.getFullYear()}-W${week}`;
      case 'month':
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${quarter}`;
      case 'year':
        return d.getFullYear().toString();
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
}

module.exports = new ReportsService();