const prisma = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errorTypes');

class InvoiceActionsService {
  /**
   * Send invoice (mark as sent and update timestamp)
   */
  async sendInvoice(userId, invoiceId, options = {}) {
    const { sendEmail = false, emailAddress } = options;

    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Don't allow sending cancelled invoices
    if (invoice.status === 'CANCELLED') {
      throw new ValidationError('Cannot send a cancelled invoice');
    }

    // Update invoice status to SENT
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT',
        sentAt: new Date()
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // TODO: Actual email sending would go here
    // For now, we'll just return the updated invoice
    let emailResult = null;
    if (sendEmail) {
      emailResult = {
        sent: false,
        message: 'Email sending not implemented yet',
        recipient: emailAddress || invoice.customer.email
      };
    }

    return {
      invoice: updatedInvoice,
      ...(emailResult && { email: emailResult })
    };
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(userId, invoiceId, newStatus, options = {}) {
    const { reason, notes } = options;

    // Validate status
    const validStatuses = ['DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError('Invalid invoice status');
    }

    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Business rule validations
    if (invoice.status === 'PAID' && newStatus !== 'PAID') {
      throw new ValidationError('Cannot change status of a paid invoice');
    }

    if (newStatus === 'PAID' && invoice.balanceAmount > 0) {
      throw new ValidationError('Cannot mark invoice as paid when balance amount is pending');
    }

    if (newStatus === 'PARTIAL_PAID' && invoice.paidAmount <= 0) {
      throw new ValidationError('Cannot mark as partially paid without any payments');
    }

    // Prepare update data
    const updateData = {
      status: newStatus,
      ...(newStatus === 'SENT' && !invoice.sentAt && { sentAt: new Date() }),
      ...(notes && { notes: notes })
    };

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return updatedInvoice;
  }

  /**
   * Generate basic invoice PDF data
   */
  async generateInvoicePDF(userId, invoiceId) {
    // Get complete invoice data
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
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
        user: {
          select: {
            firstName: true,
            lastName: true,
            businessName: true,
            gstNumber: true,
            panNumber: true,
            businessAddress: true,
            businessCity: true,
            businessState: true,
            businessPincode: true,
            businessCountry: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // For now, return structured data that frontend can use to generate PDF
    // Later this can be enhanced to generate actual PDF files
    const pdfData = {
      invoice: {
        number: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        discountAmount: invoice.discountAmount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        cgstAmount: invoice.cgstAmount,
        sgstAmount: invoice.sgstAmount,
        igstAmount: invoice.igstAmount,
        notes: invoice.notes,
        terms: invoice.terms
      },
      business: {
        name: invoice.user.businessName || `${invoice.user.firstName} ${invoice.user.lastName}`,
        gstNumber: invoice.user.gstNumber,
        panNumber: invoice.user.panNumber,
        address: invoice.user.businessAddress,
        city: invoice.user.businessCity,
        state: invoice.user.businessState,
        pincode: invoice.user.businessPincode,
        country: invoice.user.businessCountry || 'India',
        email: invoice.user.email,
        phone: invoice.user.phone
      },
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email,
        phone: invoice.customer.phone,
        gstNumber: invoice.customer.gstNumber,
        panNumber: invoice.customer.panNumber,
        address: invoice.customer.address,
        city: invoice.customer.city,
        state: invoice.customer.state,
        pincode: invoice.customer.pincode,
        country: invoice.customer.country || 'India'
      },
      items: invoice.items.map(item => ({
        id: item.id,
        description: item.description || item.product.name,
        productName: item.product.name,
        productType: item.product.type,
        hsnSacCode: item.product.hsnCode || item.product.sacCode,
        quantity: item.quantity,
        unit: item.product.unit,
        rate: item.rate,
        amount: item.amount,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount
      })),
      gstBreakdown: {
        isSameState: invoice.customer.state === invoice.user.businessState,
        cgst: invoice.cgstAmount,
        sgst: invoice.sgstAmount,
        igst: invoice.igstAmount,
        total: invoice.taxAmount
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: invoice.user.email
      }
    };

    return pdfData;
  }

  /**
   * Get invoice payments
   */
  async getInvoicePayments(userId, invoiceId) {
    // Verify invoice belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: { id: true }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true }
        }
      }
    });

    return payments;
  }

  /**
   * Record payment for specific invoice (quick payment)
   */
  async recordInvoicePayment(userId, invoiceId, paymentData) {
    // Verify invoice belongs to user and get customer info
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: { 
        id: true, 
        customerId: true, 
        balanceAmount: true, 
        status: true,
        totalAmount: true,
        paidAmount: true
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status === 'CANCELLED') {
      throw new ValidationError('Cannot record payment for cancelled invoice');
    }

    const { amount, paymentMethod, reference, notes, paymentDate } = paymentData;

    if (amount > invoice.balanceAmount) {
      throw new ValidationError(`Payment amount (${amount}) cannot exceed outstanding balance (${invoice.balanceAmount})`);
    }

    // Record payment and update invoice in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          userId,
          customerId: invoice.customerId,
          invoiceId,
          amount,
          paymentMethod,
          reference: reference || '',
          notes: notes || '',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date()
        }
      });

      // Update invoice amounts
      const newPaidAmount = invoice.paidAmount + amount;
      const newBalanceAmount = invoice.totalAmount - newPaidAmount;
      
      let newStatus = invoice.status;
      if (newBalanceAmount <= 0) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0 && invoice.status !== 'PARTIAL_PAID') {
        newStatus = 'PARTIAL_PAID';
      }

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
   * Get invoice status history (for future implementation)
   */
  async getInvoiceStatusHistory(userId, invoiceId) {
    // For now, return basic status info
    // This could be enhanced with actual status change logging
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sentAt: true,
        updatedAt: true
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const history = [
      {
        status: 'DRAFT',
        timestamp: invoice.createdAt,
        description: 'Invoice created'
      }
    ];

    if (invoice.sentAt) {
      history.push({
        status: 'SENT',
        timestamp: invoice.sentAt,
        description: 'Invoice sent to customer'
      });
    }

    if (invoice.status === 'PAID') {
      history.push({
        status: 'PAID',
        timestamp: invoice.updatedAt,
        description: 'Invoice fully paid'
      });
    } else if (invoice.status === 'PARTIAL_PAID') {
      history.push({
        status: 'PARTIAL_PAID',
        timestamp: invoice.updatedAt,
        description: 'Partial payment received'
      });
    }

    return history;
  }
}

module.exports = new InvoiceActionsService();