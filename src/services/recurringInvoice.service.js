const prisma = require('../config/database');
const { calculateGST, generateInvoiceNumber, calculateDueDate, sanitizeString } = require('../utils/helpers');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errorTypes');

class RecurringInvoiceService {
  /**
   * Create new recurring invoice
   */
  async createRecurringInvoice(userId, recurringData) {
    const { customerId, items, frequency, intervalCount, startDate, endDate, ...recurringDetails } = recurringData;

    // Verify customer belongs to user
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Calculate totals for the recurring invoice template
    let subtotal = 0;
    const recurringItems = [];

    for (const item of items) {
      const grossAmount = item.quantity * item.rate;
      const netAmount = grossAmount; // No item-level discount for recurring
      
      // Calculate tax for this item
      const gstCalc = calculateGST(netAmount, item.taxRate, customer.state, customer.businessState || 'Maharashtra');
      
      subtotal += netAmount;
      
      recurringItems.push({
        productName: sanitizeString(item.productName),
        description: sanitizeString(item.description || ''),
        quantity: item.quantity,
        rate: item.rate,
        amount: netAmount,
        taxRate: item.taxRate,
        taxAmount: gstCalc.totalTax
      });
    }

    // Apply recurring invoice discount
    const discountAmount = recurringDetails.discountAmount || 0;
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calculate total tax
    const totalTax = recurringItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotalAfterDiscount + totalTax;

    // Calculate next invoice date
    const nextInvoiceDate = this.calculateNextInvoiceDate(startDate, frequency, intervalCount);

    // Create recurring invoice with items in a transaction
    const recurringInvoice = await prisma.$transaction(async (tx) => {
      const newRecurringInvoice = await tx.recurringInvoice.create({
        data: {
          userId,
          customerId,
          name: sanitizeString(recurringData.name),
          frequency,
          intervalCount: intervalCount || 1,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          nextInvoiceDate,
          subtotal: subtotalAfterDiscount,
          taxAmount: totalTax,
          discountAmount,
          totalAmount,
          notes: sanitizeString(recurringDetails.notes || ''),
          terms: sanitizeString(recurringDetails.terms || ''),
          isActive: recurringDetails.isActive !== false,
          items: {
            create: recurringItems
          }
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              gstNumber: true,
              state: true
            }
          },
          items: true
        }
      });

      return newRecurringInvoice;
    });

    return recurringInvoice;
  }

  /**
   * Get all recurring invoices for a user with pagination and filtering
   */
  async getRecurringInvoices(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      customerId = '',
      frequency = '',
      isActive,
      dueForProcessing = false,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Convert to proper types
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Convert boolean strings
    let isActiveBool = isActive;
    if (typeof isActive === 'string') {
      isActiveBool = isActive === 'true';
    }

    let dueForProcessingBool = dueForProcessing;
    if (typeof dueForProcessing === 'string') {
      dueForProcessingBool = dueForProcessing === 'true';
    }

    // Build where clause
    const where = {
      userId,
      ...(customerId && { customerId }),
      ...(frequency && { frequency }),
      ...(isActiveBool !== undefined && { isActive: isActiveBool }),
      ...(dueForProcessingBool && {
        isActive: true,
        nextInvoiceDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { notes: { contains: search } },
          { customer: { name: { contains: search } } },
          { customer: { email: { contains: search } } }
        ]
      })
    };

    const [recurringInvoices, total] = await Promise.all([
      prisma.recurringInvoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              gstNumber: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        }
      }),
      prisma.recurringInvoice.count({ where })
    ]);

    return {
      recurringInvoices,
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
   * Get recurring invoice by ID
   */
  async getRecurringInvoiceById(userId, recurringInvoiceId) {
    const recurringInvoice = await prisma.recurringInvoice.findFirst({
      where: {
        id: recurringInvoiceId,
        userId
      },
      include: {
        customer: true,
        items: {
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!recurringInvoice) {
      throw new NotFoundError('Recurring invoice not found');
    }

    // Add computed fields
    recurringInvoice.isDueForProcessing = this.isDueForProcessing(recurringInvoice);
    recurringInvoice.nextInvoiceDateFormatted = recurringInvoice.nextInvoiceDate.toISOString().split('T')[0];

    return recurringInvoice;
  }

  /**
   * Update recurring invoice
   */
  async updateRecurringInvoice(userId, recurringInvoiceId, updateData) {
    // Check if recurring invoice exists and belongs to user
    const existingRecurringInvoice = await this.getRecurringInvoiceById(userId, recurringInvoiceId);

    // Sanitize strings
    const sanitizedData = {
      ...updateData,
      ...(updateData.name && { name: sanitizeString(updateData.name) }),
      ...(updateData.notes && { notes: sanitizeString(updateData.notes) }),
      ...(updateData.terms && { terms: sanitizeString(updateData.terms) })
    };

    // If frequency or interval changed, recalculate next invoice date
    if (sanitizedData.frequency || sanitizedData.intervalCount) {
      const newFrequency = sanitizedData.frequency || existingRecurringInvoice.frequency;
      const newIntervalCount = sanitizedData.intervalCount || existingRecurringInvoice.intervalCount;
      sanitizedData.nextInvoiceDate = this.calculateNextInvoiceDate(
        existingRecurringInvoice.nextInvoiceDate,
        newFrequency,
        newIntervalCount
      );
    }

    const recurringInvoice = await prisma.recurringInvoice.update({
      where: { id: recurringInvoiceId },
      data: sanitizedData,
      include: {
        customer: true,
        items: true
      }
    });

    return recurringInvoice;
  }

  /**
   * Delete recurring invoice
   */
  async deleteRecurringInvoice(userId, recurringInvoiceId) {
    // Check if recurring invoice exists and belongs to user
    await this.getRecurringInvoiceById(userId, recurringInvoiceId);

    await prisma.recurringInvoice.delete({
      where: { id: recurringInvoiceId }
    });

    return { message: 'Recurring invoice deleted successfully' };
  }

  /**
   * Process recurring invoice (generate actual invoice)
   */
  async processRecurringInvoice(userId, recurringInvoiceId, options = {}) {
    const { generateInvoiceDate = new Date(), updateNextDate = true } = options;

    // Get recurring invoice with all details
    const recurringInvoice = await this.getRecurringInvoiceById(userId, recurringInvoiceId);

    if (!recurringInvoice.isActive) {
      throw new ValidationError('Cannot process inactive recurring invoice');
    }

    // Check if it's due for processing
    if (!this.isDueForProcessing(recurringInvoice)) {
      throw new ValidationError('Recurring invoice is not due for processing yet');
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true }
    });

    const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber);

    // Calculate due date
    const invoiceDate = new Date(generateInvoiceDate);
    const dueDate = calculateDueDate(invoiceDate, recurringInvoice.customer.paymentTerms);

    // Create actual invoice from recurring template
    const invoice = await prisma.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          userId,
          customerId: recurringInvoice.customerId,
          invoiceNumber,
          invoiceDate,
          dueDate,
          subtotal: recurringInvoice.subtotal,
          taxAmount: recurringInvoice.taxAmount,
          discountAmount: recurringInvoice.discountAmount,
          totalAmount: recurringInvoice.totalAmount,
          paidAmount: 0,
          balanceAmount: recurringInvoice.totalAmount,
          cgstAmount: 0, // Will be calculated based on items
          sgstAmount: 0,
          igstAmount: 0,
          status: 'DRAFT',
          notes: recurringInvoice.notes,
          terms: recurringInvoice.terms
        }
      });

      // Create invoice items from recurring items
      const invoiceItems = [];
      let totalCgst = 0, totalSgst = 0, totalIgst = 0;

      for (const recurringItem of recurringInvoice.items) {
        // Calculate GST breakdown for this item
        const gstCalc = calculateGST(
          recurringItem.amount,
          recurringItem.taxRate,
          recurringInvoice.customer.state,
          recurringInvoice.customer.businessState || 'Maharashtra'
        );

        totalCgst += gstCalc.cgst;
        totalSgst += gstCalc.sgst;
        totalIgst += gstCalc.igst;

        // Create a temporary product for the invoice item
        // In a real scenario, you might want to link to actual products
        const tempProduct = await tx.product.create({
          data: {
            userId,
            name: recurringItem.productName,
            description: recurringItem.description,
            type: 'SERVICE',
            price: recurringItem.rate,
            taxRate: recurringItem.taxRate,
            isActive: false // Mark as inactive since it's auto-generated
          }
        });

        await tx.invoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            productId: tempProduct.id,
            quantity: recurringItem.quantity,
            rate: recurringItem.rate,
            amount: recurringItem.amount,
            taxRate: recurringItem.taxRate,
            taxAmount: recurringItem.taxAmount,
            description: recurringItem.description
          }
        });
      }

      // Update invoice with GST breakdown
      await tx.invoice.update({
        where: { id: newInvoice.id },
        data: {
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst
        }
      });

      // Update next invoice date if requested
      if (updateNextDate) {
        const nextDate = this.calculateNextInvoiceDate(
          invoiceDate,
          recurringInvoice.frequency,
          recurringInvoice.intervalCount
        );

        await tx.recurringInvoice.update({
          where: { id: recurringInvoiceId },
          data: { nextInvoiceDate: nextDate }
        });
      }

      return newInvoice;
    });

    // Get the complete invoice with relations
    const completeInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    return completeInvoice;
  }

  /**
   * Get recurring invoices due for processing
   */
  async getDueRecurringInvoices(userId) {
    const recurringInvoices = await prisma.recurringInvoice.findMany({
      where: {
        userId,
        isActive: true,
        nextInvoiceDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { nextInvoiceDate: 'asc' }
    });

    return recurringInvoices;
  }

  /**
   * Calculate next invoice date based on frequency
   */
  calculateNextInvoiceDate(currentDate, frequency, intervalCount = 1) {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'DAILY':
        date.setDate(date.getDate() + intervalCount);
        break;
      case 'WEEKLY':
        date.setDate(date.getDate() + (7 * intervalCount));
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + intervalCount);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + (3 * intervalCount));
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + intervalCount);
        break;
      default:
        throw new ValidationError('Invalid frequency');
    }
    
    return date;
  }

  /**
   * Check if recurring invoice is due for processing
   */
  isDueForProcessing(recurringInvoice) {
    if (!recurringInvoice.isActive) return false;
    
    const now = new Date();
    const nextDate = new Date(recurringInvoice.nextInvoiceDate);
    
    // Check if next invoice date has passed
    if (nextDate > now) return false;
    
    // Check if end date has passed (if set)
    if (recurringInvoice.endDate) {
      const endDate = new Date(recurringInvoice.endDate);
      if (endDate < now) return false;
    }
    
    return true;
  }

  /**
   * Get recurring invoice statistics
   */
  async getRecurringInvoiceStats(userId) {
    const [
      totalStats,
      frequencyStats,
      dueCount,
      activeCount
    ] = await Promise.all([
      prisma.recurringInvoice.aggregate({
        where: { userId },
        _count: true,
        _sum: { totalAmount: true }
      }),
      prisma.recurringInvoice.groupBy({
        by: ['frequency'],
        where: { userId, isActive: true },
        _count: true,
        _sum: { totalAmount: true }
      }),
      prisma.recurringInvoice.count({
        where: {
          userId,
          isActive: true,
          nextInvoiceDate: { lte: new Date() },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        }
      }),
      prisma.recurringInvoice.count({
        where: { userId, isActive: true }
      })
    ]);

    const stats = {
      total: totalStats._count,
      active: activeCount,
      inactive: totalStats._count - activeCount,
      dueForProcessing: dueCount,
      totalValue: totalStats._sum.totalAmount || 0,
      byFrequency: {}
    };

    // Group by frequency
    frequencyStats.forEach(stat => {
      stats.byFrequency[stat.frequency] = {
        count: stat._count,
        value: stat._sum.totalAmount || 0
      };
    });

    return stats;
  }
}

module.exports = new RecurringInvoiceService();