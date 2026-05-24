const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  createPaymentSchema,
  updatePaymentSchema,
  paymentIdParamSchema,
  paymentQuerySchema,
  paymentSearchSchema,
  bulkPaymentSchema
} = require('../validations/payment.validation');

// Import controller
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// All payment routes require authentication
router.use(authenticateToken);

// Get payment statistics
router.get('/stats',
  logActivity('VIEW_PAYMENT_STATS', 'payment'),
  paymentController.getPaymentStats
);

// Get outstanding invoices
router.get('/outstanding',
  validateQuery(Joi.object({
    customerId: Joi.string().optional()
  })),
  logActivity('VIEW_OUTSTANDING_INVOICES', 'payment'),
  paymentController.getOutstandingInvoices
);

// Search payments
router.get('/search',
  validateQuery(paymentSearchSchema),
  logActivity('SEARCH_PAYMENTS', 'payment'),
  paymentController.searchPayments
);

// Record bulk payments
router.post('/bulk',
  validateRequest(bulkPaymentSchema),
  logActivity('RECORD_BULK_PAYMENTS', 'payment'),
  paymentController.recordBulkPayments
);

// Get all payments with filtering and pagination
router.get('/',
  validateQuery(paymentQuerySchema),
  logActivity('VIEW_PAYMENTS', 'payment'),
  paymentController.getPayments
);

// Get payment by ID
router.get('/:id',
  validateParams(paymentIdParamSchema),
  logActivity('VIEW_PAYMENT', 'payment'),
  paymentController.getPaymentById
);

// Record new payment
router.post('/',
  validateRequest(createPaymentSchema),
  logActivity('RECORD_PAYMENT', 'payment'),
  paymentController.recordPayment
);

// Update payment
router.put('/:id',
  validateParams(paymentIdParamSchema),
  validateRequest(updatePaymentSchema),
  logActivity('UPDATE_PAYMENT', 'payment'),
  paymentController.updatePayment
);

// Delete payment
router.delete('/:id',
  validateParams(paymentIdParamSchema),
  logActivity('DELETE_PAYMENT', 'payment'),
  paymentController.deletePayment
);

module.exports = router;