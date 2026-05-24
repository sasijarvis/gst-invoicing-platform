const customerService = require('../services/customer.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class CustomerController {
  /**
   * Create new customer
   */
  createCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.createCustomer(req.user.id, req.body);
    successResponse(res, customer, 'Customer created successfully', 201);
  })

  /**
   * Get all customers with pagination and filtering
   */
  getCustomers = asyncHandler(async (req, res) => {
    const result = await customerService.getCustomers(req.user.id, req.query);
    paginatedResponse(res, result.customers, result.pagination, 'Customers retrieved successfully');
  })

  /**
   * Get customer by ID
   */
  getCustomerById = asyncHandler(async (req, res) => {
    const customer = await customerService.getCustomerById(req.user.id, req.params.id);
    successResponse(res, customer, 'Customer retrieved successfully');
  })

  /**
   * Update customer
   */
  updateCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.updateCustomer(req.user.id, req.params.id, req.body);
    successResponse(res, customer, 'Customer updated successfully');
  })

  /**
   * Delete customer
   */
  deleteCustomer = asyncHandler(async (req, res) => {
    const result = await customerService.deleteCustomer(req.user.id, req.params.id);
    successResponse(res, result, result.message);
  })

  /**
   * Search customers
   */
  searchCustomers = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const customers = await customerService.searchCustomers(req.user.id, q, parseInt(limit));
    successResponse(res, customers, 'Search completed successfully');
  })

  /**
   * Get customer invoices
   */
  getCustomerInvoices = asyncHandler(async (req, res) => {
    const result = await customerService.getCustomerInvoices(req.user.id, req.params.id, req.query);
    paginatedResponse(res, result.invoices, result.pagination, 'Customer invoices retrieved successfully');
  })

  /**
   * Get customer payments
   */
  getCustomerPayments = asyncHandler(async (req, res) => {
    const result = await customerService.getCustomerPayments(req.user.id, req.params.id, req.query);
    paginatedResponse(res, result.payments, result.pagination, 'Customer payments retrieved successfully');
  })

  /**
   * Get customer statistics
   */
  getCustomerStats = asyncHandler(async (req, res) => {
    const stats = await customerService.getCustomerStats(req.user.id);
    successResponse(res, stats, 'Customer statistics retrieved successfully');
  })
}

module.exports = new CustomerController();