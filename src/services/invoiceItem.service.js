const prisma = require('../config/database');
const { calculateGST, sanitizeString } = require('../utils/helpers');
const { ValidationError, NotFoundError } = require('../utils/errorTypes');

class InvoiceItemService {
  /**
   * Add item to invoice
   */
  async addInvoiceItem(userId, invoiceId, itemData) {
    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { customer: true }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Don't allow adding items to paid invoices
    if (invoice.status === 'PAID') {
      throw new ValidationError('Cannot add items to a paid invoice');
    }

    // Verify product belongs to user and is active
    const product = await prisma.product.findFirst({
      where: {
        id: itemData.productId,
        userId,
        isActive: true
      }
    });

    if (!product) {
      throw new NotFoundError('Product not found or inactive');
    }

    // Calculate item amounts
    const rate = itemData.rate !== undefined ? itemData.rate : product.price;
    const quantity = itemData.quantity;
    const itemDiscount = itemData.discount || 0;
    
    const grossAmount = quantity * rate;
    const discountAmount = (grossAmount * itemDiscount) / 100;
    const netAmount = grossAmount - discountAmount;
    
    // Calculate tax
    const gstCalc = calculateGST(netAmount, product.taxRate, invoice.customer.state, invoice.customer.businessState || 'Maharashtra');

    // Add item to invoice
    const invoiceItem = await prisma.invoiceItem.create({
      data: {
        invoiceId,
        productId: product.id,
        quantity,
        rate,
        amount: netAmount,
        taxRate: product.taxRate,
        taxAmount: gstCalc.totalTax,
        description: sanitizeString(itemData.description || product.description || '')
      },
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
    });

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(invoiceId);

    return invoiceItem;
  }

  /**
   * Update invoice item
   */
  async updateInvoiceItem(userId, invoiceId, itemId, updateData) {
    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { customer: true }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Don't allow updating items in paid invoices
    if (invoice.status === 'PAID') {
      throw new ValidationError('Cannot update items in a paid invoice');
    }

    // Check if item exists
    const existingItem = await prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
      include: { product: true }
    });

    if (!existingItem) {
      throw new NotFoundError('Invoice item not found');
    }

    // Calculate new amounts if quantity or rate changed
    let updatedData = { ...updateData };
    
    if (updateData.quantity !== undefined || updateData.rate !== undefined) {
      const newQuantity = updateData.quantity !== undefined ? updateData.quantity : existingItem.quantity;
      const newRate = updateData.rate !== undefined ? updateData.rate : existingItem.rate;
      const discount = updateData.discount !== undefined ? updateData.discount : 0;
      
      const grossAmount = newQuantity * newRate;
      const discountAmount = (grossAmount * discount) / 100;
      const netAmount = grossAmount - discountAmount;
      
      // Calculate tax
      const gstCalc = calculateGST(netAmount, existingItem.product.taxRate, invoice.customer.state, invoice.customer.businessState || 'Maharashtra');
      
      updatedData = {
        ...updatedData,
        amount: netAmount,
        taxAmount: gstCalc.totalTax
      };
    }

    // Sanitize description if provided
    if (updateData.description !== undefined) {
      updatedData.description = sanitizeString(updateData.description);
    }

    const invoiceItem = await prisma.invoiceItem.update({
      where: { id: itemId },
      data: updatedData,
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
    });

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(invoiceId);

    return invoiceItem;
  }

  /**
   * Remove item from invoice
   */
  async removeInvoiceItem(userId, invoiceId, itemId) {
    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Don't allow removing items from paid invoices
    if (invoice.status === 'PAID') {
      throw new ValidationError('Cannot remove items from a paid invoice');
    }

    // Check if item exists
    const existingItem = await prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId }
    });

    if (!existingItem) {
      throw new NotFoundError('Invoice item not found');
    }

    // Check if this is the last item
    const itemCount = await prisma.invoiceItem.count({
      where: { invoiceId }
    });

    if (itemCount <= 1) {
      throw new ValidationError('Cannot remove the last item from an invoice');
    }

    await prisma.invoiceItem.delete({
      where: { id: itemId }
    });

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(invoiceId);

    return { message: 'Invoice item removed successfully' };
  }

  /**
   * Recalculate invoice totals
   */
  async recalculateInvoiceTotals(invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!invoice) return;

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;

    // Calculate totals from all items
    for (const item of invoice.items) {
      subtotal += item.amount;
      
      // Calculate GST for this item
      const gstCalc = calculateGST(
        item.amount, 
        item.product.taxRate, 
        invoice.customer.state, 
        invoice.customer.businessState || 'Maharashtra'
      );
      
      totalCgst += gstCalc.cgst;
      totalSgst += gstCalc.sgst;
      totalIgst += gstCalc.igst;
      totalTax += gstCalc.totalTax;
    }

    // Apply invoice-level discount
    const subtotalAfterDiscount = subtotal - (invoice.discountAmount || 0);
    const totalAmount = subtotalAfterDiscount + totalTax;
    const balanceAmount = totalAmount - invoice.paidAmount;

    // Update invoice totals
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: subtotalAfterDiscount,
        taxAmount: totalTax,
        totalAmount,
        balanceAmount,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst
      }
    });
  }

  /**
   * Get all items for an invoice
   */
  async getInvoiceItems(userId, invoiceId) {
    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const items = await prisma.invoiceItem.findMany({
      where: { invoiceId },
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
      },
      orderBy: { id: 'asc' }
    });

    return items;
  }

  /**
   * Get invoice item by ID
   */
  async getInvoiceItemById(userId, invoiceId, itemId) {
    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const item = await prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
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
    });

    if (!item) {
      throw new NotFoundError('Invoice item not found');
    }

    return item;
  }
}

module.exports = new InvoiceItemService();