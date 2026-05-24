const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdParamSchema,
  invoiceQuerySchema,
  invoiceSearchSchema,
  addInvoiceItemSchema,
  updateInvoiceItemSchema,
  invoiceItemIdParamSchema,
  updateInvoiceStatusSchema,
  cloneInvoiceSchema
} = require('../validations/invoice.validation');

// Import controller
const invoiceController = require('../controllers/invoice.controller');

const router = express.Router();

// All invoice routes require authentication
router.use(authenticateToken);

// Get invoice statistics
router.get('/stats',
  logActivity('VIEW_INVOICE_STATS', 'invoice'),
  invoiceController.getInvoiceStats
);

// Search invoices
router.get('/search',
  validateQuery(invoiceSearchSchema),
  logActivity('SEARCH_INVOICES', 'invoice'),
  invoiceController.searchInvoices
);

// Get all invoices with filtering and pagination
router.get('/',
  validateQuery(invoiceQuerySchema),
  logActivity('VIEW_INVOICES', 'invoice'),
  invoiceController.getInvoices
);

// Get invoice by ID
router.get('/:id',
  validateParams(invoiceIdParamSchema),
  logActivity('VIEW_INVOICE', 'invoice'),
  invoiceController.getInvoiceById
);

// Create new invoice
router.post('/',
  validateRequest(createInvoiceSchema),
  logActivity('CREATE_INVOICE', 'invoice'),
  invoiceController.createInvoice
);

// Update invoice
router.put('/:id',
  validateParams(invoiceIdParamSchema),
  validateRequest(updateInvoiceSchema),
  logActivity('UPDATE_INVOICE', 'invoice'),
  invoiceController.updateInvoice
);

// Delete invoice
router.delete('/:id',
  validateParams(invoiceIdParamSchema),
  logActivity('DELETE_INVOICE', 'invoice'),
  invoiceController.deleteInvoice
);

// Invoice Items Management
router.get('/:id/items',
  validateParams(invoiceIdParamSchema),
  logActivity('VIEW_INVOICE_ITEMS', 'invoice'),
  invoiceController.getInvoiceItems
);

router.post('/:id/items',
  validateParams(invoiceIdParamSchema),
  validateRequest(addInvoiceItemSchema),
  logActivity('ADD_INVOICE_ITEM', 'invoice'),
  invoiceController.addInvoiceItem
);

router.get('/:id/items/:itemId',
  validateParams(invoiceItemIdParamSchema),
  logActivity('VIEW_INVOICE_ITEM', 'invoice'),
  invoiceController.getInvoiceItemById
);

router.put('/:id/items/:itemId',
  validateParams(invoiceItemIdParamSchema),
  validateRequest(updateInvoiceItemSchema),
  logActivity('UPDATE_INVOICE_ITEM', 'invoice'),
  invoiceController.updateInvoiceItem
);

router.delete('/:id/items/:itemId',
  validateParams(invoiceItemIdParamSchema),
  logActivity('REMOVE_INVOICE_ITEM', 'invoice'),
  invoiceController.removeInvoiceItem
);

// Import invoice actions controller
const invoiceActionsController = require('../controllers/invoiceActions.controller');

// Invoice Actions
router.post('/:id/send',
  validateParams(invoiceIdParamSchema),
  logActivity('SEND_INVOICE', 'invoice'),
  invoiceActionsController.sendInvoice
);

router.put('/:id/status',
  validateParams(invoiceIdParamSchema),
  validateRequest(Joi.object({
    status: Joi.string().valid('DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED').required(),
    reason: Joi.string().optional(),
    notes: Joi.string().optional()
  })),
  logActivity('UPDATE_INVOICE_STATUS', 'invoice'),
  invoiceActionsController.updateInvoiceStatus
);

router.get('/:id/pdf',
  validateParams(invoiceIdParamSchema),
  logActivity('DOWNLOAD_INVOICE_PDF', 'invoice'),
  invoiceActionsController.generateInvoicePDF
);

router.get('/:id/payments',
  validateParams(invoiceIdParamSchema),
  logActivity('VIEW_INVOICE_PAYMENTS', 'invoice'),
  invoiceActionsController.getInvoicePayments
);

router.post('/:id/payments',
  validateParams(invoiceIdParamSchema),
  validateRequest(Joi.object({
    amount: Joi.number().min(0.01).required(),
    paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'OTHER').required(),
    reference: Joi.string().optional().allow(''),
    notes: Joi.string().optional().allow(''),
    paymentDate: Joi.date().optional()
  })),
  logActivity('RECORD_INVOICE_PAYMENT', 'invoice'),
  invoiceActionsController.recordInvoicePayment
);

router.get('/:id/status-history',
  validateParams(invoiceIdParamSchema),
  logActivity('VIEW_INVOICE_HISTORY', 'invoice'),
  invoiceActionsController.getInvoiceStatusHistory
);

module.exports = router;