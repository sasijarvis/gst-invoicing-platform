const invoiceActionsService = require('../services/invoiceActions.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class InvoiceActionsController {
  /**
   * Send invoice
   */
  sendInvoice = asyncHandler(async (req, res) => {
    const result = await invoiceActionsService.sendInvoice(req.user.id, req.params.id, req.body);
    successResponse(res, result, 'Invoice sent successfully');
  })

  /**
   * Update invoice status
   */
  updateInvoiceStatus = asyncHandler(async (req, res) => {
    const invoice = await invoiceActionsService.updateInvoiceStatus(req.user.id, req.params.id, req.body.status, req.body);
    successResponse(res, invoice, 'Invoice status updated successfully');
  })

  /**
   * Generate invoice PDF data
   */
  generateInvoicePDF = asyncHandler(async (req, res) => {
    const pdfData = await invoiceActionsService.generateInvoicePDF(req.user.id, req.params.id);
    successResponse(res, pdfData, 'Invoice PDF data generated successfully');
  })

  /**
   * Get invoice payments
   */
  getInvoicePayments = asyncHandler(async (req, res) => {
    const payments = await invoiceActionsService.getInvoicePayments(req.user.id, req.params.id);
    successResponse(res, payments, 'Invoice payments retrieved successfully');
  })

  /**
   * Record payment for invoice
   */
  recordInvoicePayment = asyncHandler(async (req, res) => {
    const payment = await invoiceActionsService.recordInvoicePayment(req.user.id, req.params.id, req.body);
    successResponse(res, payment, 'Payment recorded successfully', 201);
  })

  /**
   * Get invoice status history
   */
  getInvoiceStatusHistory = asyncHandler(async (req, res) => {
    const history = await invoiceActionsService.getInvoiceStatusHistory(req.user.id, req.params.id);
    successResponse(res, history, 'Invoice status history retrieved successfully');
  })
}

module.exports = new InvoiceActionsController();