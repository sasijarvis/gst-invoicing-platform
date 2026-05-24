const Joi = require('joi');

const createRecurringInvoiceSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Recurring invoice name must be at least 2 characters long',
      'string.max': 'Recurring invoice name cannot exceed 100 characters',
      'any.required': 'Recurring invoice name is required'
    }),
  
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required'
    }),
  
  frequency: Joi.string()
    .valid('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')
    .required()
    .messages({
      'any.only': 'Frequency must be one of: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY',
      'any.required': 'Frequency is required'
    }),
  
  intervalCount: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional()
    .default(1)
    .messages({
      'number.min': 'Interval count must be at least 1',
      'number.max': 'Interval count cannot exceed 12'
    }),
  
  startDate: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'Start date cannot be in the past',
      'any.required': 'Start date is required'
    }),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  
  items: Joi.array()
    .items(
      Joi.object({
        productName: Joi.string().max(100).required().messages({
          'any.required': 'Product name is required for each item'
        }),
        description: Joi.string().max(200).optional().allow(''),
        quantity: Joi.number().min(0.01).required().messages({
          'number.min': 'Quantity must be greater than 0',
          'any.required': 'Quantity is required'
        }),
        rate: Joi.number().min(0).required().messages({
          'number.min': 'Rate must be greater than or equal to 0',
          'any.required': 'Rate is required'
        }),
        taxRate: Joi.number().min(0).max(100).default(18.0).messages({
          'number.min': 'Tax rate must be greater than or equal to 0',
          'number.max': 'Tax rate cannot exceed 100'
        })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required'
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
  
  isActive: Joi.boolean()
    .optional()
    .default(true)
});

const updateRecurringInvoiceSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Recurring invoice name must be at least 2 characters long',
      'string.max': 'Recurring invoice name cannot exceed 100 characters'
    }),
  
  frequency: Joi.string()
    .valid('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')
    .optional()
    .messages({
      'any.only': 'Frequency must be one of: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY'
    }),
  
  intervalCount: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional()
    .messages({
      'number.min': 'Interval count must be at least 1',
      'number.max': 'Interval count cannot exceed 12'
    }),
  
  endDate: Joi.date()
    .optional()
    .allow(null)
    .messages({
      'date.base': 'End date must be a valid date'
    }),
  
  discountAmount: Joi.number()
    .min(0)
    .optional()
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
  
  isActive: Joi.boolean().optional(),
  
  nextInvoiceDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Next invoice date must be a valid date'
    })
});

const recurringInvoiceIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'Recurring invoice ID is required'
    })
});

const recurringInvoiceQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  customerId: Joi.string().optional(),
  frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY').optional(),
  isActive: Joi.boolean().optional(),
  dueForProcessing: Joi.boolean().optional(),
  sortBy: Joi.string().valid('name', 'frequency', 'nextInvoiceDate', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const processRecurringInvoiceSchema = Joi.object({
  generateInvoiceDate: Joi.date()
    .optional()
    .default(() => new Date())
    .messages({
      'date.base': 'Generate invoice date must be a valid date'
    }),
  
  updateNextDate: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'Update next date must be a boolean'
    })
});

const addRecurringItemSchema = Joi.object({
  productName: Joi.string()
    .max(100)
    .required()
    .messages({
      'any.required': 'Product name is required'
    }),
  
  description: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  
  quantity: Joi.number()
    .min(0.01)
    .required()
    .messages({
      'number.min': 'Quantity must be greater than 0',
      'any.required': 'Quantity is required'
    }),
  
  rate: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Rate must be greater than or equal to 0',
      'any.required': 'Rate is required'
    }),
  
  taxRate: Joi.number()
    .min(0)
    .max(100)
    .default(18.0)
    .messages({
      'number.min': 'Tax rate must be greater than or equal to 0',
      'number.max': 'Tax rate cannot exceed 100'
    })
});

const updateRecurringItemSchema = Joi.object({
  productName: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Product name cannot exceed 100 characters'
    }),
  
  description: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  
  quantity: Joi.number()
    .min(0.01)
    .optional()
    .messages({
      'number.min': 'Quantity must be greater than 0'
    }),
  
  rate: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Rate must be greater than or equal to 0'
    }),
  
  taxRate: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Tax rate must be greater than or equal to 0',
      'number.max': 'Tax rate cannot exceed 100'
    })
});

const recurringItemIdParamSchema = Joi.object({
  id: Joi.string().required().messages({
    'any.required': 'Recurring invoice ID is required'
  }),
  itemId: Joi.string().required().messages({
    'any.required': 'Recurring item ID is required'
  })
});

module.exports = {
  createRecurringInvoiceSchema,
  updateRecurringInvoiceSchema,
  recurringInvoiceIdParamSchema,
  recurringInvoiceQuerySchema,
  processRecurringInvoiceSchema,
  addRecurringItemSchema,
  updateRecurringItemSchema,
  recurringItemIdParamSchema
};