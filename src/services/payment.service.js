const prisma = require('../config/database');
const { sanitizeString } = require('../utils/helpers');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errorTypes');

class PaymentService {
  /**
   * Record new payment
   */
  async recordPayment(userId, paymentData) {
    const { invoiceId, customerId, amount, ...paymentDetails } = paymentData;

    // Verify invoice belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { 
        id: invoiceId, 
        userId,
        customerId // Ensure customer matches
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found or does not belong to the specified customer');
    }

    // Verify customer belongs to user
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check if invoice is in a valid state for payment
    if (invoice.status === 'CANCELLED') {
      throw new ValidationError('Cannot record payment for a cancelled invoice');
    }

    // Check if payment amount is valid
    if (amount > invoice.balanceAmount) {
      throw new ValidationError(`Payment amount (${amount}) cannot exceed outstanding balance (${invoice.balanceAmount})`);
    }

    // Sanitize string inputs
    const sanitizedData = {
      ...paymentDetails,
      reference: sanitizeString(paymentDetails.reference || ''),
      notes: sanitizeString(paymentDetails.notes || '')
    };

    // Record payment and update invoice in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          userId,
          customerId,
          invoiceId,
          amount,
          paymentDate: paymentDetails.paymentDate || new Date(),
          paymentMethod: paymentDetails.paymentMethod,
          reference: sanitizedData.reference,
          notes: sanitizedData.notes
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Update invoice payment amounts
      const newPaidAmount = invoice.paidAmount + amount;
      const newBalanceAmount = invoice.totalAmount - newPaidAmount;
      
      // Determine new invoice status
      let newStatus = invoice.status;
      if (newBalanceAmount <= 0) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0 && invoice.status !== 'PARTIAL_PAID') {
        newStatus = 'PARTIAL_PAID';
      }

      // Update invoice
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus
        }
      });

      return payment;
    });

    return result;
  }

  /**
   * Get all payments for a user with pagination and filtering
   */
  async getPayments(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      customerId = '',
      invoiceId = '',
      paymentMethod = '',
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Convert to proper types
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      userId,
      ...(customerId && { customerId }),
      ...(invoiceId && { invoiceId }),
      ...(paymentMethod && { paymentMethod }),
      ...(dateFrom && { paymentDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { 
        paymentDate: { 
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          lte: new Date(dateTo) 
        } 
      }),
      ...(amountMin && { amount: { gte: parseFloat(amountMin) } }),
      ...(amountMax && { 
        amount: { 
          ...(amountMin ? { gte: parseFloat(amountMin) } : {}),
          lte: parseFloat(amountMax) 
        } 
      }),
      ...(search && {
        OR: [
          { reference: { contains: search } },
          { notes: { contains: search } },
          { customer: { name: { contains: search } } },
          { customer: { email: { contains: search } } },
          { invoice: { invoiceNumber: { contains: search } } }
        ]
      })
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ]);

    return {
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(userId, paymentId) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId
      },
      include: {
        customer: true,
        invoice: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  /**
   * Update payment
   */
  async updatePayment(userId, paymentId, updateData) {
    // Check if payment exists and belongs to user
    const existingPayment = await this.getPaymentById(userId, paymentId);

    // Don't allow updating amount as it affects invoice calculations
    if (updateData.amount && updateData.amount !== existingPayment.amount) {
      throw new ValidationError('Cannot update payment amount. Delete and create a new payment instead.');
    }

    // Sanitize strings
    const sanitizedData = {
      ...updateData,
      ...(updateData.reference && { reference: sanitizeString(updateData.reference) }),
      ...(updateData.notes && { notes: sanitizeString(updateData.notes) })
    };

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: sanitizedData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true
          }
        }
      }
    });

    return payment;
  }

  /**
   * Delete payment
   */
  async deletePayment(userId, paymentId) {
    // Check if payment exists and belongs to user
    const existingPayment = await this.getPaymentById(userId, paymentId);

    // Update invoice amounts when deleting payment
    await prisma.$transaction(async (tx) => {
      // Delete payment
      await tx.payment.delete({
        where: { id: paymentId }
      });

      // Recalculate invoice totals
      const invoice = await tx.invoice.findUnique({
        where: { id: existingPayment.invoiceId },
        include: {
          payments: true
        }
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const newBalanceAmount = invoice.totalAmount - totalPaid;
        
        // Determine new status
        let newStatus = 'SENT';
        if (totalPaid <= 0) {
          newStatus = 'SENT';
        } else if (newBalanceAmount <= 0) {
          newStatus = 'PAID';
        } else {
          newStatus = 'PARTIAL_PAID';
        }

        await tx.invoice.update({
          where: { id: existingPayment.invoiceId },
          data: {
            paidAmount: totalPaid,
            balanceAmount: newBalanceAmount,
            status: newStatus
          }
        });
      }
    });

    return { message: 'Payment deleted successfully' };
  }

  /**
   * Search payments
   */
  async searchPayments(userId, query, limit = 10) {
    const limitNum = parseInt(limit);
    
    const payments = await prisma.payment.findMany({
      where: {
        userId,
        OR: [
          { reference: { contains: query } },
          { notes: { contains: query } },
          { customer: { name: { contains: query } } },
          { customer: { email: { contains: query } } },
          { invoice: { invoiceNumber: { contains: query } } }
        ]
      },
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true
          }
        }
      }
    });

    return payments;
  }

  /**
   * Get outstanding invoices
   */
  async getOutstandingInvoices(userId, customerId = null) {
    const where = {
      userId,
      status: { in: ['SENT', 'PARTIAL_PAID'] },
      balanceAmount: { gt: 0 },
      ...(customerId && { customerId })
    };

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return invoices;
  }

  /**
   * Record bulk payments
   */
  async recordBulkPayments(userId, bulkData) {
    const { payments, customerId, paymentDate, commonReference, commonNotes } = bulkData;

    // Verify customer belongs to user
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify all invoices exist and belong to the customer
    const invoiceIds = payments.map(p => p.invoiceId);
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        userId,
        customerId
      }
    });

    if (invoices.length !== invoiceIds.length) {
      throw new NotFoundError('One or more invoices not found or do not belong to the customer');
    }

    // Create invoice map for validation
    const invoiceMap = invoices.reduce((map, invoice) => {
      map[invoice.id] = invoice;
      return map;
    }, {});

    // Validate payment amounts
    for (const payment of payments) {
      const invoice = invoiceMap[payment.invoiceId];
      if (payment.amount > invoice.balanceAmount) {
        throw new ValidationError(`Payment amount for invoice ${invoice.invoiceNumber} exceeds outstanding balance`);
      }
    }

    // Process all payments in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdPayments = [];

      for (const paymentData of payments) {
        const invoice = invoiceMap[paymentData.invoiceId];
        
        // Create payment
        const payment = await tx.payment.create({
          data: {
            userId,
            customerId,
            invoiceId: paymentData.invoiceId,
            amount: paymentData.amount,
            paymentDate: paymentDate || new Date(),
            paymentMethod: paymentData.paymentMethod,
            reference: sanitizeString(paymentData.reference || commonReference || ''),
            notes: sanitizeString(paymentData.notes || commonNotes || '')
          }
        });

        // Update invoice
        const newPaidAmount = invoice.paidAmount + paymentData.amount;
        const newBalanceAmount = invoice.totalAmount - newPaidAmount;
        
        let newStatus = invoice.status;
        if (newBalanceAmount <= 0) {
          newStatus = 'PAID';
        } else if (newPaidAmount > 0) {
          newStatus = 'PARTIAL_PAID';
        }

        await tx.invoice.update({
          where: { id: paymentData.invoiceId },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newStatus
          }
        });

        createdPayments.push(payment);
      }

      return createdPayments;
    });

    return results;
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(userId) {
    const [
      totalStats,
      methodStats,
      recentPayments,
      monthlyStats
    ] = await Promise.all([
      // Total payments
      prisma.payment.aggregate({
        where: { userId },
        _count: true,
        _sum: { amount: true }
      }),
      // By payment method
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: { userId },
        _count: true,
        _sum: { amount: true }
      }),
      // Recent payments (last 30 days)
      prisma.payment.aggregate({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        _count: true,
        _sum: { amount: true }
      }),
      // This month vs last month
      Promise.all([
        prisma.payment.aggregate({
          where: {
            userId,
            paymentDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          },
          _count: true,
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: {
            userId,
            paymentDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          },
          _count: true,
          _sum: { amount: true }
        })
      ])
    ]);

    const stats = {
      total: {
        count: totalStats._count,
        amount: totalStats._sum.amount || 0
      },
      recent30Days: {
        count: recentPayments._count,
        amount: recentPayments._sum.amount || 0
      },
      thisMonth: {
        count: monthlyStats[0]._count,
        amount: monthlyStats[0]._sum.amount || 0
      },
      lastMonth: {
        count: monthlyStats[1]._count,
        amount: monthlyStats[1]._sum.amount || 0
      },
      byMethod: {}
    };

    // Group by payment method
    methodStats.forEach(stat => {
      stats.byMethod[stat.paymentMethod] = {
        count: stat._count,
        amount: stat._sum.amount || 0
      };
    });

    return stats;
  }
}

module.exports = new PaymentService();