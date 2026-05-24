const prisma = require('../config/database');
const { calculateGST, generateInvoiceNumber, calculateDueDate, isOverdue, sanitizeString } = require('../utils/helpers');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errorTypes');

class InvoiceService {
  /**
   * Create new invoice
   */
  async createInvoice(userId, invoiceData) {
    const { customerId, items, ...invoiceDetails } = invoiceData;

    // Verify customer belongs to user
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify all products belong to user and are active
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId,
        isActive: true
      }
    });

    if (products.length !== productIds.length) {
      throw new NotFoundError('One or more products not found or inactive');
    }

    // Create product map for easy lookup
    const productMap = products.reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {});

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true }
    });

    const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber);

    // Calculate due date if not provided
    const invoiceDate = invoiceDetails.invoiceDate || new Date();
    const dueDate = invoiceDetails.dueDate || calculateDueDate(invoiceDate, customer.paymentTerms);

    // Calculate totals and create invoice items
    let subtotal = 0;
    const invoiceItems = [];

    for (const item of items) {
      const product = productMap[item.productId];
      const rate = item.rate !== undefined ? item.rate : product.price;
      const quantity = item.quantity;
      const itemDiscount = item.discount || 0;
      
      // Calculate item amount before discount
      const grossAmount = quantity * rate;
      const discountAmount = (grossAmount * itemDiscount) / 100;
      const netAmount = grossAmount - discountAmount;
      
      // Calculate tax for this item
      const gstCalc = calculateGST(netAmount, product.taxRate, customer.state, customer.businessState || 'Maharashtra');
      
      subtotal += netAmount;
      
      invoiceItems.push({
        productId: product.id,
        quantity,
        rate,
        amount: netAmount,
        taxRate: product.taxRate,
        taxAmount: gstCalc.totalTax,
        description: sanitizeString(item.description || product.description || '')
      });
    }

    // Apply invoice-level discount
    const invoiceDiscountAmount = invoiceDetails.discountAmount || 0;
    const subtotalAfterDiscount = subtotal - invoiceDiscountAmount;

    // Calculate total tax amounts
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;

    for (const item of invoiceItems) {
      const product = productMap[item.productId];
      const gstCalc = calculateGST(item.amount, product.taxRate, customer.state, customer.businessState || 'Maharashtra');
      
      totalCgst += gstCalc.cgst;
      totalSgst += gstCalc.sgst;
      totalIgst += gstCalc.igst;
      totalTax += gstCalc.totalTax;
    }

    const totalAmount = subtotalAfterDiscount + totalTax;

    // Create invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          userId,
          customerId,
          invoiceNumber,
          invoiceDate,
          dueDate,
          subtotal: subtotalAfterDiscount,
          taxAmount: totalTax,
          discountAmount: invoiceDiscountAmount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          status: invoiceDetails.status || 'DRAFT',
          notes: sanitizeString(invoiceDetails.notes || ''),
          terms: sanitizeString(invoiceDetails.terms || ''),
          items: {
            create: invoiceItems
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
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  unit: true,
                  hsnCode: true,
                  sacCode: true
                }
              }
            }
          }
        }
      });

      return newInvoice;
    });

    return invoice;
  }

  /**
   * Get all invoices for a user with pagination and filtering
   */
  async getInvoices(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      customerId = '',
      status = '',
      dateFrom,
      dateTo,
      overdue = false,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Convert to proper types
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Convert boolean strings
    let overdueBool = overdue;
    if (typeof overdue === 'string') {
      overdueBool = overdue === 'true';
    }

    // Build where clause
    const where = {
      userId,
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(dateFrom && { invoiceDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { 
        invoiceDate: { 
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          lte: new Date(dateTo) 
        } 
      }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search } },
          { notes: { contains: search } },
          { customer: { name: { contains: search } } },
          { customer: { email: { contains: search } } }
        ]
      })
    };

    // Add overdue filter
    if (overdueBool) {
      where.AND = [
        { status: { in: ['SENT', 'PARTIAL_PAID'] } },
        { dueDate: { lt: new Date() } }
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
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
              items: true,
              payments: true
            }
          }
        }
      }),
      prisma.invoice.count({ where })
    ]);

    return {
      invoices,
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
   * Get invoice by ID
   */
  async getInvoiceById(userId, invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                unit: true,
                hsnCode: true,
                sacCode: true
              }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Add computed fields
    invoice.isOverdue = isOverdue(invoice.dueDate) && ['SENT', 'PARTIAL_PAID'].includes(invoice.status);

    return invoice;
  }

  /**
   * Update invoice
   */
  async updateInvoice(userId, invoiceId, updateData) {
    // Check if invoice exists and belongs to user
    const existingInvoice = await this.getInvoiceById(userId, invoiceId);

    // Don't allow updating paid invoices
    if (existingInvoice.status === 'PAID') {
      throw new ValidationError('Cannot update a paid invoice');
    }

    // Verify customer if being changed
    if (updateData.customerId && updateData.customerId !== existingInvoice.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: updateData.customerId, userId }
      });
      
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
    }

    // Sanitize strings
    const sanitizedData = {
      ...updateData,
      ...(updateData.notes && { notes: sanitizeString(updateData.notes) }),
      ...(updateData.terms && { terms: sanitizeString(updateData.terms) })
    };

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: sanitizedData,
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    return invoice;
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(userId, invoiceId) {
    // Check if invoice exists and belongs to user
    const existingInvoice = await this.getInvoiceById(userId, invoiceId);

    // Don't allow deleting paid invoices or invoices with payments
    if (existingInvoice.status === 'PAID' || existingInvoice.paidAmount > 0) {
      throw new ValidationError('Cannot delete an invoice with payments');
    }

    await prisma.invoice.delete({
      where: { id: invoiceId }
    });

    return { message: 'Invoice deleted successfully' };
  }

  /**
   * Search invoices
   */
  async searchInvoices(userId, query, limit = 10) {
    const limitNum = parseInt(limit);
    
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { invoiceNumber: { contains: query } },
          { notes: { contains: query } },
          { customer: { name: { contains: query } } },
          { customer: { email: { contains: query } } }
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
        }
      }
    });

    return invoices;
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(userId) {
    const [
      statusStats,
      totalStats,
      overdueCount
    ] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
        _sum: { totalAmount: true }
      }),
      prisma.invoice.aggregate({
        where: { userId },
        _count: true,
        _sum: { 
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true
        }
      }),
      prisma.invoice.count({
        where: {
          userId,
          status: { in: ['SENT', 'PARTIAL_PAID'] },
          dueDate: { lt: new Date() }
        }
      })
    ]);

    const stats = {
      total: totalStats._count,
      totalAmount: totalStats._sum.totalAmount || 0,
      paidAmount: totalStats._sum.paidAmount || 0,
      outstandingAmount: totalStats._sum.balanceAmount || 0,
      overdue: overdueCount,
      byStatus: {}
    };

    // Group by status
    statusStats.forEach(stat => {
      stats.byStatus[stat.status] = {
        count: stat._count,
        amount: stat._sum.totalAmount || 0
      };
    });

    return stats;
  }
}

module.exports = new InvoiceService();