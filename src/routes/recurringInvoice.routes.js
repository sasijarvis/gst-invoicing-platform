const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  createRecurringInvoiceSchema,
  updateRecurringInvoiceSchema,
  recurringInvoiceIdParamSchema,
  recurringInvoiceQuerySchema,
  processRecurringInvoiceSchema
} = require('../validations/recurringInvoice.validation');

// Import controller
const recurringInvoiceController = require('../controllers/recurringInvoice.controller');

const router = express.Router();

// All recurring invoice routes require authentication
router.use(authenticateToken);

// Get recurring invoice statistics
router.get('/stats',
  logActivity('VIEW_RECURRING_INVOICE_STATS', 'recurringInvoice'),
  recurringInvoiceController.getRecurringInvoiceStats
);

// Get recurring invoices due for processing
router.get('/due',
  logActivity('VIEW_DUE_RECURRING_INVOICES', 'recurringInvoice'),
  recurringInvoiceController.getDueRecurringInvoices
);

// Get all recurring invoices with filtering and pagination
router.get('/',
  validateQuery(recurringInvoiceQuerySchema),
  logActivity('VIEW_RECURRING_INVOICES', 'recurringInvoice'),
  recurringInvoiceController.getRecurringInvoices
);

// Get recurring invoice by ID
router.get('/:id',
  validateParams(recurringInvoiceIdParamSchema),
  logActivity('VIEW_RECURRING_INVOICE', 'recurringInvoice'),
  recurringInvoiceController.getRecurringInvoiceById
);

// Create new recurring invoice
router.post('/',
  validateRequest(createRecurringInvoiceSchema),
  logActivity('CREATE_RECURRING_INVOICE', 'recurringInvoice'),
  recurringInvoiceController.createRecurringInvoice
);

// Update recurring invoice
router.put('/:id',
  validateParams(recurringInvoiceIdParamSchema),
  validateRequest(updateRecurringInvoiceSchema),
  logActivity('UPDATE_RECURRING_INVOICE', 'recurringInvoice'),
  recurringInvoiceController.updateRecurringInvoice
);

// Process recurring invoice (generate actual invoice)
router.post('/:id/process',
  validateParams(recurringInvoiceIdParamSchema),
  validateRequest(processRecurringInvoiceSchema),
  logActivity('PROCESS_RECURRING_INVOICE', 'recurringInvoice'),
  recurringInvoiceController.processRecurringInvoice
);

// Delete recurring invoice
router.delete('/:id',
  validateParams(recurringInvoiceIdParamSchema),
  logActivity('DELETE_RECURRING_INVOICE', 'recurringInvoice'),
  recurringInvoiceController.deleteRecurringInvoice
);

module.exports = router;