const recurringInvoiceService = require('../services/recurringInvoice.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class RecurringInvoiceController {
  /**
   * Create new recurring invoice
   */
  createRecurringInvoice = asyncHandler(async (req, res) => {
    const recurringInvoice = await recurringInvoiceService.createRecurringInvoice(req.user.id, req.body);
    successResponse(res, recurringInvoice, 'Recurring invoice created successfully', 201);
  })

  /**
   * Get all recurring invoices with pagination and filtering
   */
  getRecurringInvoices = asyncHandler(async (req, res) => {
    const result = await recurringInvoiceService.getRecurringInvoices(req.user.id, req.query);
    paginatedResponse(res, result.recurringInvoices, result.pagination, 'Recurring invoices retrieved successfully');
  })

  /**
   * Get recurring invoice by ID
   */
  getRecurringInvoiceById = asyncHandler(async (req, res) => {
    const recurringInvoice = await recurringInvoiceService.getRecurringInvoiceById(req.user.id, req.params.id);
    successResponse(res, recurringInvoice, 'Recurring invoice retrieved successfully');
  })

  /**
   * Update recurring invoice
   */
  updateRecurringInvoice = asyncHandler(async (req, res) => {
    const recurringInvoice = await recurringInvoiceService.updateRecurringInvoice(req.user.id, req.params.id, req.body);
    successResponse(res, recurringInvoice, 'Recurring invoice updated successfully');
  })

  /**
   * Delete recurring invoice
   */
  deleteRecurringInvoice = asyncHandler(async (req, res) => {
    const result = await recurringInvoiceService.deleteRecurringInvoice(req.user.id, req.params.id);
    successResponse(res, result, result.message);
  })

  /**
   * Process recurring invoice (generate actual invoice)
   */
  processRecurringInvoice = asyncHandler(async (req, res) => {
    const invoice = await recurringInvoiceService.processRecurringInvoice(req.user.id, req.params.id, req.body);
    successResponse(res, invoice, 'Invoice generated from recurring template successfully', 201);
  })

  /**
   * Get recurring invoices due for processing
   */
  getDueRecurringInvoices = asyncHandler(async (req, res) => {
    const recurringInvoices = await recurringInvoiceService.getDueRecurringInvoices(req.user.id);
    successResponse(res, recurringInvoices, 'Due recurring invoices retrieved successfully');
  })

  /**
   * Get recurring invoice statistics
   */
  getRecurringInvoiceStats = asyncHandler(async (req, res) => {
    const stats = await recurringInvoiceService.getRecurringInvoiceStats(req.user.id);
    successResponse(res, stats, 'Recurring invoice statistics retrieved successfully');
  })
}

module.exports = new RecurringInvoiceController();