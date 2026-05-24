const Joi = require('joi');

const createCustomerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Customer name must be at least 2 characters long',
      'string.max': 'Customer name cannot exceed 100 characters',
      'any.required': 'Customer name is required'
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[1-9][\d\s\-()]{7,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  gstNumber: Joi.string()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Invalid GST number format (e.g., 27AAAAA0000A1Z5)'
    }),
  
  panNumber: Joi.string()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Invalid PAN number format (e.g., AAAAA0000A)'
    }),
  
  // Address fields
  address: Joi.string().max(200).optional().allow(''),
  city: Joi.string().max(50).optional().allow(''),
  state: Joi.string().max(50).optional().allow(''),
  pincode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Pincode must be exactly 6 digits'
    }),
  country: Joi.string().max(50).optional().allow(''),
  
  // Business Information
  contactPerson: Joi.string().max(100).optional().allow(''),
  website: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Website must be a valid URL'
  }),
  notes: Joi.string().max(500).optional().allow(''),
  
  // Financial Settings
  creditLimit: Joi.number().min(0).optional().default(0),
  paymentTerms: Joi.number().min(1).max(365).optional().default(30).messages({
    'number.min': 'Payment terms must be at least 1 day',
    'number.max': 'Payment terms cannot exceed 365 days'
  }),
  
  isActive: Joi.boolean().optional().default(true)
});

const updateCustomerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Customer name must be at least 2 characters long',
      'string.max': 'Customer name cannot exceed 100 characters'
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[1-9][\d\s\-()]{7,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  gstNumber: Joi.string()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Invalid GST number format'
    }),
  
  panNumber: Joi.string()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Invalid PAN number format'
    }),
  
  address: Joi.string().max(200).optional().allow(''),
  city: Joi.string().max(50).optional().allow(''),
  state: Joi.string().max(50).optional().allow(''),
  pincode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Pincode must be exactly 6 digits'
    }),
  country: Joi.string().max(50).optional().allow(''),
  
  contactPerson: Joi.string().max(100).optional().allow(''),
  website: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Website must be a valid URL'
  }),
  notes: Joi.string().max(500).optional().allow(''),
  
  creditLimit: Joi.number().min(0).optional(),
  paymentTerms: Joi.number().min(1).max(365).optional().messages({
    'number.min': 'Payment terms must be at least 1 day',
    'number.max': 'Payment terms cannot exceed 365 days'
  }),
  
  isActive: Joi.boolean().optional()
});

const customerIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required'
    })
});

const customerQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  state: Joi.string().optional().allow(''),
  isActive: Joi.boolean().optional(),
  sortBy: Joi.string().valid('name', 'email', 'createdAt', 'updatedAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

const customerSearchSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .required()
    .messages({
      'string.min': 'Search query must be at least 2 characters long',
      'any.required': 'Search query is required'
    }),
  limit: Joi.number().min(1).max(50).default(10)
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  customerQuerySchema,
  customerSearchSchema
};