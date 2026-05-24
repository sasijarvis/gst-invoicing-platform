const Joi = require('joi');

const createPlanSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Plan name must be at least 2 characters long',
      'string.max': 'Plan name cannot exceed 100 characters',
      'any.required': 'Plan name is required'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  type: Joi.string()
    .valid('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM')
    .required()
    .messages({
      'any.only': 'Plan type must be one of: BASIC, STANDARD, PREMIUM, ENTERPRISE, CUSTOM',
      'any.required': 'Plan type is required'
    }),
  
  billingCycle: Joi.string()
    .valid('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')
    .required()
    .messages({
      'any.only': 'Billing cycle must be one of: MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY',
      'any.required': 'Billing cycle is required'
    }),
  
  price: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Price is required'
    }),
  
  currency: Joi.string()
    .length(3)
    .default('INR')
    .messages({
      'string.length': 'Currency must be 3 characters (e.g., INR, USD)'
    }),
  
  trialDays: Joi.number()
    .min(0)
    .max(365)
    .default(0)
    .messages({
      'number.min': 'Trial days cannot be negative',
      'number.max': 'Trial days cannot exceed 365 days'
    }),
  
  features: Joi.object({
    maxCustomers: Joi.number().min(-1).default(-1), // -1 means unlimited
    maxInvoicesPerMonth: Joi.number().min(-1).default(-1),
    maxProducts: Joi.number().min(-1).default(-1),
    maxUsers: Joi.number().min(1).default(1),
    recurringInvoices: Joi.boolean().default(true),
    advancedReports: Joi.boolean().default(false),
    apiAccess: Joi.boolean().default(false),
    emailSupport: Joi.boolean().default(true),
    phoneSupport: Joi.boolean().default(false),
    customBranding: Joi.boolean().default(false),
    multiCurrency: Joi.boolean().default(false),
    inventoryManagement: Joi.boolean().default(false),
    paymentGateway: Joi.boolean().default(false)
  }).default({}),
  
  isActive: Joi.boolean().default(true),
  
  setupFee: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Setup fee cannot be negative'
    }),
  
  discountPercentage: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'Discount percentage cannot be negative',
      'number.max': 'Discount percentage cannot exceed 100%'
    }),
  
  taxRate: Joi.number()
    .min(0)
    .max(100)
    .default(18)
    .messages({
      'number.min': 'Tax rate cannot be negative',
      'number.max': 'Tax rate cannot exceed 100%'
    })
});

const updatePlanSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  price: Joi.number().min(0).optional(),
  trialDays: Joi.number().min(0).max(365).optional(),
  features: Joi.object({
    maxCustomers: Joi.number().min(-1).optional(),
    maxInvoicesPerMonth: Joi.number().min(-1).optional(),
    maxProducts: Joi.number().min(-1).optional(),
    maxUsers: Joi.number().min(1).optional(),
    recurringInvoices: Joi.boolean().optional(),
    advancedReports: Joi.boolean().optional(),
    apiAccess: Joi.boolean().optional(),
    emailSupport: Joi.boolean().optional(),
    phoneSupport: Joi.boolean().optional(),
    customBranding: Joi.boolean().optional(),
    multiCurrency: Joi.boolean().optional(),
    inventoryManagement: Joi.boolean().optional(),
    paymentGateway: Joi.boolean().optional()
  }).optional(),
  isActive: Joi.boolean().optional(),
  setupFee: Joi.number().min(0).optional(),
  discountPercentage: Joi.number().min(0).max(100).optional(),
  taxRate: Joi.number().min(0).max(100).optional()
});

const planIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'Plan ID is required'
    })
});

module.exports = {
  createPlanSchema,
  updatePlanSchema,
  planIdParamSchema
};