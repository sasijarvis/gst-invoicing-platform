const Joi = require('joi');

const createPaymentSchema = Joi.object({
  invoiceId: Joi.string()
    .required()
    .messages({
      'any.required': 'Invoice ID is required'
    }),
  
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required'
    }),
  
  amount: Joi.number()
    .min(0.01)
    .precision(2)
    .required()
    .messages({
      'number.min': 'Payment amount must be greater than 0',
      'any.required': 'Payment amount is required'
    }),
  
  paymentDate: Joi.date()
    .optional()
    .default(() => new Date())
    .messages({
      'date.base': 'Payment date must be a valid date'
    }),
  
  paymentMethod: Joi.string()
    .valid('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'OTHER')
    .required()
    .messages({
      'any.only': 'Payment method must be one of: CASH, BANK_TRANSFER, CHEQUE, UPI, CARD, OTHER',
      'any.required': 'Payment method is required'
    }),
  
  reference: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Reference cannot exceed 100 characters'
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const updatePaymentSchema = Joi.object({
  amount: Joi.number()
    .min(0.01)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Payment amount must be greater than 0'
    }),
  
  paymentDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Payment date must be a valid date'
    }),
  
  paymentMethod: Joi.string()
    .valid('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'OTHER')
    .optional()
    .messages({
      'any.only': 'Payment method must be one of: CASH, BANK_TRANSFER, CHEQUE, UPI, CARD, OTHER'
    }),
  
  reference: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Reference cannot exceed 100 characters'
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const paymentIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'Payment ID is required'
    })
});

const paymentQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  customerId: Joi.string().optional(),
  invoiceId: Joi.string().optional(),
  paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'OTHER').optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().min(Joi.ref('dateFrom')).optional().messages({
    'date.min': 'Date to must be after date from'
  }),
  amountMin: Joi.number().min(0).optional(),
  amountMax: Joi.number().min(Joi.ref('amountMin')).optional().messages({
    'number.min': 'Maximum amount must be greater than minimum amount'
  }),
  sortBy: Joi.string().valid('paymentDate', 'amount', 'paymentMethod', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const paymentSearchSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .required()
    .messages({
      'string.min': 'Search query must be at least 2 characters long',
      'any.required': 'Search query is required'
    }),
  limit: Joi.number().min(1).max(50).default(10)
});

const bulkPaymentSchema = Joi.object({
  payments: Joi.array()
    .items(
      Joi.object({
        invoiceId: Joi.string().required(),
        amount: Joi.number().min(0.01).precision(2).required(),
        paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'OTHER').required(),
        reference: Joi.string().max(100).optional().allow(''),
        notes: Joi.string().max(500).optional().allow('')
      })
    )
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one payment is required',
      'array.max': 'Cannot process more than 20 payments at once',
      'any.required': 'Payments array is required'
    }),
  
  customerId: Joi.string().required(),
  paymentDate: Joi.date().optional().default(() => new Date()),
  commonReference: Joi.string().max(100).optional().allow(''),
  commonNotes: Joi.string().max(500).optional().allow('')
});

module.exports = {
  createPaymentSchema,
  updatePaymentSchema,
  paymentIdParamSchema,
  paymentQuerySchema,
  paymentSearchSchema,
  bulkPaymentSchema
};