const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required'
    }),
  
  planId: Joi.string()
    .required()
    .messages({
      'any.required': 'Plan ID is required'
    }),
  
  startDate: Joi.date()
    .default(() => new Date())
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  
  customPrice: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Custom price cannot be negative'
    }),
  
  customDiscountPercentage: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Discount percentage cannot be negative',
      'number.max': 'Discount percentage cannot exceed 100%'
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    }),
  
  autoRenew: Joi.boolean()
    .default(true),
  
  useTrialPeriod: Joi.boolean()
    .default(true)
});

const updateSubscriptionSchema = Joi.object({
  planId: Joi.string().optional(),
  endDate: Joi.date().optional(),
  customPrice: Joi.number().min(0).optional(),
  customDiscountPercentage: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().max(500).optional().allow(''),
  autoRenew: Joi.boolean().optional(),
  pauseSubscription: Joi.boolean().optional(),
  pauseReason: Joi.string().max(200).optional().allow('')
});

const upgradePlanSchema = Joi.object({
  newPlanId: Joi.string()
    .required()
    .messages({
      'any.required': 'New plan ID is required'
    }),
  
  effectiveDate: Joi.date()
    .default(() => new Date())
    .messages({
      'date.base': 'Effective date must be a valid date'
    }),
  
  prorationMethod: Joi.string()
    .valid('IMMEDIATE', 'NEXT_CYCLE', 'CUSTOM_DATE')
    .default('IMMEDIATE')
    .messages({
      'any.only': 'Proration method must be one of: IMMEDIATE, NEXT_CYCLE, CUSTOM_DATE'
    }),
  
  customDate: Joi.date()
    .when('prorationMethod', {
      is: 'CUSTOM_DATE',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'date.base': 'Custom date must be a valid date',
      'any.required': 'Custom date is required when proration method is CUSTOM_DATE'
    }),
  
  applyProration: Joi.boolean()
    .default(true),
  
  notes: Joi.string()
    .max(300)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 300 characters'
    })
});

const cancelSubscriptionSchema = Joi.object({
  cancellationDate: Joi.date()
    .default(() => new Date())
    .messages({
      'date.base': 'Cancellation date must be a valid date'
    }),
  
  cancellationType: Joi.string()
    .valid('IMMEDIATE', 'END_OF_CYCLE', 'CUSTOM_DATE')
    .default('END_OF_CYCLE')
    .messages({
      'any.only': 'Cancellation type must be one of: IMMEDIATE, END_OF_CYCLE, CUSTOM_DATE'
    }),
  
  customDate: Joi.date()
    .when('cancellationType', {
      is: 'CUSTOM_DATE',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'date.base': 'Custom date must be a valid date',
      'any.required': 'Custom date is required when cancellation type is CUSTOM_DATE'
    }),
  
  reason: Joi.string()
    .valid('CUSTOMER_REQUEST', 'PAYMENT_FAILED', 'BUSINESS_CLOSURE', 'UPGRADE', 'DOWNGRADE', 'OTHER')
    .default('CUSTOMER_REQUEST')
    .messages({
      'any.only': 'Reason must be one of: CUSTOMER_REQUEST, PAYMENT_FAILED, BUSINESS_CLOSURE, UPGRADE, DOWNGRADE, OTHER'
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    }),
  
  refundAmount: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Refund amount cannot be negative'
    })
});

const subscriptionIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'Subscription ID is required'
    })
});

const subscriptionQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  status: Joi.string().valid('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED').optional(),
  planId: Joi.string().optional(),
  customerId: Joi.string().optional(),
  sortBy: Joi.string().valid('startDate', 'endDate', 'status', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

module.exports = {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  upgradePlanSchema,
  cancelSubscriptionSchema,
  subscriptionIdParamSchema,
  subscriptionQuerySchema
};