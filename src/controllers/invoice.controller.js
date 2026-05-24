const invoiceService = require('../services/invoice.service');
const invoiceItemService = require('../services/invoiceItem.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class InvoiceController {
  /**
   * Create new invoice
   */
  createInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.createInvoice(req.user.id, req.body);
    successResponse(res, invoice, 'Invoice created successfully', 201);
  })

  /**
   * Get all invoices with pagination and filtering
   */
  getInvoices = asyncHandler(async (req, res) => {
    const result = await invoiceService.getInvoices(req.user.id, req.query);
    paginatedResponse(res, result.invoices, result.pagination, 'Invoices retrieved successfully');
  })

  /**
   * Get invoice by ID
   */
  getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.user.id, req.params.id);
    successResponse(res, invoice, 'Invoice retrieved successfully');
  })

  /**
   * Update invoice
   */
  updateInvoice = asyncHandler(async (req, res) => {
    const invoice = await invoiceService.updateInvoice(req.user.id, req.params.id, req.body);
    successResponse(res, invoice, 'Invoice updated successfully');
  })

  /**
   * Delete invoice
   */
  deleteInvoice = asyncHandler(async (req, res) => {
    const result = await invoiceService.deleteInvoice(req.user.id, req.params.id);
    successResponse(res, result, result.message);
  })

  /**
   * Search invoices
   */
  searchInvoices = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const invoices = await invoiceService.searchInvoices(req.user.id, q, limit);
    successResponse(res, invoices, 'Search completed successfully');
  })

  /**
   * Get invoice statistics
   */
  getInvoiceStats = asyncHandler(async (req, res) => {
    const stats = await invoiceService.getInvoiceStats(req.user.id);
    successResponse(res, stats, 'Invoice statistics retrieved successfully');
  })

  /**
   * Add item to invoice
   */
  addInvoiceItem = asyncHandler(async (req, res) => {
    const item = await invoiceItemService.addInvoiceItem(req.user.id, req.params.id, req.body);
    successResponse(res, item, 'Invoice item added successfully', 201);
  })

  /**
   * Update invoice item
   */
  updateInvoiceItem = asyncHandler(async (req, res) => {
    const item = await invoiceItemService.updateInvoiceItem(req.user.id, req.params.id, req.params.itemId, req.body);
    successResponse(res, item, 'Invoice item updated successfully');
  })

  /**
   * Remove invoice item
   */
  removeInvoiceItem = asyncHandler(async (req, res) => {
    const result = await invoiceItemService.removeInvoiceItem(req.user.id, req.params.id, req.params.itemId);
    successResponse(res, result, result.message);
  })

  /**
   * Get invoice items
   */
  getInvoiceItems = asyncHandler(async (req, res) => {
    const items = await invoiceItemService.getInvoiceItems(req.user.id, req.params.id);
    successResponse(res, items, 'Invoice items retrieved successfully');
  })

  /**
   * Get invoice item by ID
   */
  getInvoiceItemById = asyncHandler(async (req, res) => {
    const item = await invoiceItemService.getInvoiceItemById(req.user.id, req.params.id, req.params.itemId);
    successResponse(res, item, 'Invoice item retrieved successfully');
  })
}

module.exports = new InvoiceController();