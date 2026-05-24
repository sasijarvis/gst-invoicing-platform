const paymentService = require('../services/payment.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class PaymentController {
  /**
   * Record new payment
   */
  recordPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.recordPayment(req.user.id, req.body);
    successResponse(res, payment, 'Payment recorded successfully', 201);
  })

  /**
   * Get all payments with pagination and filtering
   */
  getPayments = asyncHandler(async (req, res) => {
    const result = await paymentService.getPayments(req.user.id, req.query);
    paginatedResponse(res, result.payments, result.pagination, 'Payments retrieved successfully');
  })

  /**
   * Get payment by ID
   */
  getPaymentById = asyncHandler(async (req, res) => {
    const payment = await paymentService.getPaymentById(req.user.id, req.params.id);
    successResponse(res, payment, 'Payment retrieved successfully');
  })

  /**
   * Update payment
   */
  updatePayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.updatePayment(req.user.id, req.params.id, req.body);
    successResponse(res, payment, 'Payment updated successfully');
  })

  /**
   * Delete payment
   */
  deletePayment = asyncHandler(async (req, res) => {
    const result = await paymentService.deletePayment(req.user.id, req.params.id);
    successResponse(res, result, result.message);
  })

  /**
   * Search payments
   */
  searchPayments = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const payments = await paymentService.searchPayments(req.user.id, q, limit);
    successResponse(res, payments, 'Search completed successfully');
  })

  /**
   * Get outstanding invoices
   */
  getOutstandingInvoices = asyncHandler(async (req, res) => {
    const { customerId } = req.query;
    const invoices = await paymentService.getOutstandingInvoices(req.user.id, customerId);
    successResponse(res, invoices, 'Outstanding invoices retrieved successfully');
  })

  /**
   * Record bulk payments
   */
  recordBulkPayments = asyncHandler(async (req, res) => {
    const payments = await paymentService.recordBulkPayments(req.user.id, req.body);
    successResponse(res, payments, 'Bulk payments recorded successfully', 201);
  })

  /**
   * Get payment statistics
   */
  getPaymentStats = asyncHandler(async (req, res) => {
    const stats = await paymentService.getPaymentStats(req.user.id);
    successResponse(res, stats, 'Payment statistics retrieved successfully');
  })
}

module.exports = new PaymentController();