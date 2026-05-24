const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  customerQuerySchema,
  customerSearchSchema
} = require('../validations/customer.validation');

// Import controller
const customerController = require('../controllers/customer.controller');

const router = express.Router();

// All customer routes require authentication
router.use(authenticateToken);

// Get customer statistics
router.get('/stats', 
  logActivity('VIEW_CUSTOMER_STATS', 'customer'),
  customerController.getCustomerStats
);

// Search customers
router.get('/search',
  validateQuery(customerSearchSchema),
  logActivity('SEARCH_CUSTOMERS', 'customer'),
  customerController.searchCustomers
);

// Get all customers with filtering and pagination
router.get('/',
  validateQuery(customerQuerySchema),
  logActivity('VIEW_CUSTOMERS', 'customer'),
  customerController.getCustomers
);

// Get customer by ID
router.get('/:id',
  validateParams(customerIdParamSchema),
  logActivity('VIEW_CUSTOMER', 'customer'),
  customerController.getCustomerById
);

// Create new customer
router.post('/',
  validateRequest(createCustomerSchema),
  logActivity('CREATE_CUSTOMER', 'customer'),
  customerController.createCustomer
);

// Update customer
router.put('/:id',
  validateParams(customerIdParamSchema),
  validateRequest(updateCustomerSchema),
  logActivity('UPDATE_CUSTOMER', 'customer'),
  customerController.updateCustomer
);

// Delete customer
router.delete('/:id',
  validateParams(customerIdParamSchema),
  logActivity('DELETE_CUSTOMER', 'customer'),
  customerController.deleteCustomer
);

// Customer invoices
router.get('/:id/invoices',
  validateParams(customerIdParamSchema),
  validateQuery(Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(50).default(10)
  })),
  logActivity('VIEW_CUSTOMER_INVOICES', 'customer'),
  customerController.getCustomerInvoices
);

// Customer payments
router.get('/:id/payments',
  validateParams(customerIdParamSchema),
  validateQuery(Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(50).default(10)
  })),
  logActivity('VIEW_CUSTOMER_PAYMENTS', 'customer'),
  customerController.getCustomerPayments
);

module.exports = router;