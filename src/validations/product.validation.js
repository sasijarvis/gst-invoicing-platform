const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters long',
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  type: Joi.string()
    .valid('PRODUCT', 'SERVICE')
    .required()
    .messages({
      'any.only': 'Type must be either PRODUCT or SERVICE',
      'any.required': 'Product type is required'
    }),
  
  price: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.min': 'Price must be greater than or equal to 0',
      'any.required': 'Price is required'
    }),
  
  unit: Joi.string()
    .max(20)
    .optional()
    .default('Nos')
    .messages({
      'string.max': 'Unit cannot exceed 20 characters'
    }),
  
  // HSN Code for products (6 or 8 digits)
  hsnCode: Joi.string()
    .pattern(/^[0-9]{4,8}$/)
    .when('type', {
      is: 'PRODUCT',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'string.pattern.base': 'HSN code must be 4 to 8 digits',
      'any.unknown': 'HSN code is only applicable for products'
    }),
  
  // SAC Code for services (6 digits)
  sacCode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .when('type', {
      is: 'SERVICE',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'string.pattern.base': 'SAC code must be exactly 6 digits',
      'any.unknown': 'SAC code is only applicable for services'
    }),
  
  taxRate: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .default(18.0)
    .messages({
      'number.min': 'Tax rate must be greater than or equal to 0',
      'number.max': 'Tax rate cannot exceed 100'
    }),
  
  // Stock management (only for products)
  stockQuantity: Joi.number()
    .integer()
    .min(0)
    .when('type', {
      is: 'PRODUCT',
      then: Joi.number().integer().min(0).default(0),
      otherwise: Joi.forbidden()
    })
    .messages({
      'number.min': 'Stock quantity must be greater than or equal to 0',
      'any.unknown': 'Stock quantity is only applicable for products'
    }),
  
  lowStockAlert: Joi.number()
    .integer()
    .min(0)
    .when('type', {
      is: 'PRODUCT',
      then: Joi.number().integer().min(0).default(10),
      otherwise: Joi.forbidden()
    })
    .messages({
      'number.min': 'Low stock alert must be greater than or equal to 0',
      'any.unknown': 'Low stock alert is only applicable for products'
    }),
  
  category: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Category cannot exceed 50 characters'
    }),
  
  isActive: Joi.boolean()
    .optional()
    .default(true)
});

const updateProductSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Product name must be at least 2 characters long',
      'string.max': 'Product name cannot exceed 100 characters'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  type: Joi.string()
    .valid('PRODUCT', 'SERVICE')
    .optional()
    .messages({
      'any.only': 'Type must be either PRODUCT or SERVICE'
    }),
  
  price: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Price must be greater than or equal to 0'
    }),
  
  unit: Joi.string()
    .max(20)
    .optional()
    .messages({
      'string.max': 'Unit cannot exceed 20 characters'
    }),
  
  hsnCode: Joi.string()
    .pattern(/^[0-9]{4,8}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'HSN code must be 4 to 8 digits'
    }),
  
  sacCode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'SAC code must be exactly 6 digits'
    }),
  
  taxRate: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Tax rate must be greater than or equal to 0',
      'number.max': 'Tax rate cannot exceed 100'
    }),
  
  stockQuantity: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Stock quantity must be greater than or equal to 0'
    }),
  
  lowStockAlert: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Low stock alert must be greater than or equal to 0'
    }),
  
  category: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Category cannot exceed 50 characters'
    }),
  
  isActive: Joi.boolean()
    .optional()
});

const productIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'Product ID is required'
    })
});

const productQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  type: Joi.string().valid('PRODUCT', 'SERVICE').optional(),
  category: Joi.string().optional().allow(''),
  isActive: Joi.boolean().optional(),
  lowStock: Joi.boolean().optional(), // Filter products with low stock
  sortBy: Joi.string().valid('name', 'price', 'category', 'stockQuantity', 'createdAt', 'updatedAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

const productSearchSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .required()
    .messages({
      'string.min': 'Search query must be at least 2 characters long',
      'any.required': 'Search query is required'
    }),
  type: Joi.string().valid('PRODUCT', 'SERVICE').optional(),
  limit: Joi.number().min(1).max(50).default(10)
});

const stockUpdateSchema = Joi.object({
  stockQuantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.min': 'Stock quantity must be greater than or equal to 0',
      'any.required': 'Stock quantity is required'
    }),
  
  reason: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Reason cannot exceed 200 characters'
    })
});

const bulkUpdateSchema = Joi.object({
  productIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one product ID is required',
      'array.max': 'Cannot update more than 50 products at once',
      'any.required': 'Product IDs are required'
    }),
  
  updates: Joi.object({
    category: Joi.string().max(50).optional(),
    taxRate: Joi.number().min(0).max(100).precision(2).optional(),
    isActive: Joi.boolean().optional()
  }).min(1).required().messages({
    'object.min': 'At least one field to update is required'
  })
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productQuerySchema,
  productSearchSchema,
  stockUpdateSchema,
  bulkUpdateSchema
};