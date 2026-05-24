const Joi = require('joi');

const createInvoiceSchema = Joi.object({
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required'
    }),
  
  invoiceDate: Joi.date()
    .optional()
    .default(() => new Date())
    .messages({
      'date.base': 'Invoice date must be a valid date'
    }),
  
  dueDate: Joi.date()
    .optional()
    .min(Joi.ref('invoiceDate'))
    .messages({
      'date.min': 'Due date must be after invoice date'
    }),
  
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required().messages({
          'any.required': 'Product ID is required for each item'
        }),
        quantity: Joi.number().min(0.01).required().messages({
          'number.min': 'Quantity must be greater than 0',
          'any.required': 'Quantity is required'
        }),
        rate: Joi.number().min(0).optional().messages({
          'number.min': 'Rate must be greater than or equal to 0'
        }),
        description: Joi.string().max(200).optional().allow(''),
        discount: Joi.number().min(0).max(100).optional().default(0).messages({
          'number.min': 'Discount must be greater than or equal to 0',
          'number.max': 'Discount cannot exceed 100%'
        })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Invoice items are required'
    }),
  
  discountAmount: Joi.number()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.min': 'Discount amount must be greater than or equal to 0'
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    }),
  
  terms: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Terms cannot exceed 1000 characters'
    }),
  
  status: Joi.string()
    .valid('DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED')
    .optional()
    .default('DRAFT')
    .messages({
      'any.only': 'Status must be one of: DRAFT, SENT, PAID, PARTIAL_PAID, OVERDUE, CANCELLED'
    })
});

const updateInvoiceSchema = Joi.object({
  customerId: Joi.string().optional(),
  
  invoiceDate: Joi.date().optional().messages({
    'date.base': 'Invoice date must be a valid date'
  }),
  
  dueDate: Joi.date().optional().messages({
    'date.base': 'Due date must be a valid date'
  }),
  
  discountAmount: Joi.number().min(0).optional().messages({
    'number.min': 'Discount amount must be greater than or equal to 0'
  }),
  
  notes: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Notes cannot exceed 500 characters'
  }),
  
  terms: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Terms cannot exceed 1000 characters'
  }),
  
  status: Joi.string()
    .valid('DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED')
    .optional()
    .messages({
      'any.only': 'Status must be one of: DRAFT, SENT, PAID, PARTIAL_PAID, OVERDUE, CANCELLED'
    })
});

const invoiceIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'Invoice ID is required'
    })
});

const invoiceQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  customerId: Joi.string().optional(),
  status: Joi.string().valid('DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED').optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().min(Joi.ref('dateFrom')).optional().messages({
    'date.min': 'Date to must be after date from'
  }),
  overdue: Joi.boolean().optional(),
  sortBy: Joi.string().valid('invoiceNumber', 'invoiceDate', 'dueDate', 'totalAmount', 'status', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const invoiceSearchSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .required()
    .messages({
      'string.min': 'Search query must be at least 2 characters long',
      'any.required': 'Search query is required'
    }),
  limit: Joi.number().min(1).max(50).default(10)
});

const addInvoiceItemSchema = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': 'Product ID is required'
  }),
  quantity: Joi.number().min(0.01).required().messages({
    'number.min': 'Quantity must be greater than 0',
    'any.required': 'Quantity is required'
  }),
  rate: Joi.number().min(0).optional().messages({
    'number.min': 'Rate must be greater than or equal to 0'
  }),
  description: Joi.string().max(200).optional().allow(''),
  discount: Joi.number().min(0).max(100).optional().default(0).messages({
    'number.min': 'Discount must be greater than or equal to 0',
    'number.max': 'Discount cannot exceed 100%'
  })
});

const updateInvoiceItemSchema = Joi.object({
  quantity: Joi.number().min(0.01).optional().messages({
    'number.min': 'Quantity must be greater than 0'
  }),
  rate: Joi.number().min(0).optional().messages({
    'number.min': 'Rate must be greater than or equal to 0'
  }),
  description: Joi.string().max(200).optional().allow(''),
  discount: Joi.number().min(0).max(100).optional().messages({
    'number.min': 'Discount must be greater than or equal to 0',
    'number.max': 'Discount cannot exceed 100%'
  })
});

const invoiceItemIdParamSchema = Joi.object({
  id: Joi.string().required().messages({
    'any.required': 'Invoice ID is required'
  }),
  itemId: Joi.string().required().messages({
    'any.required': 'Invoice item ID is required'
  })
});

const updateInvoiceStatusSchema = Joi.object({
  status: Joi.string()
    .valid('DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED')
    .required()
    .messages({
      'any.only': 'Status must be one of: DRAFT, SENT, PAID, PARTIAL_PAID, OVERDUE, CANCELLED',
      'any.required': 'Status is required'
    }),
  
  sentAt: Joi.date().when('status', {
    is: 'SENT',
    then: Joi.date().optional().default(() => new Date()),
    otherwise: Joi.forbidden()
  })
});

const cloneInvoiceSchema = Joi.object({
  customerId: Joi.string().optional(),
  invoiceDate: Joi.date().optional().default(() => new Date()),
  includeItems: Joi.boolean().optional().default(true),
  status: Joi.string().valid('DRAFT').optional().default('DRAFT')
});

module.exports = {
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
};