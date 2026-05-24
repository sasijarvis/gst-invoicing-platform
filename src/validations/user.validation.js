const Joi = require('joi');

const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[1-9][\d\s\-()]{7,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  // Business Information
  businessName: Joi.string().max(100).optional().allow(''),
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
  businessAddress: Joi.string().max(200).optional().allow(''),
  businessCity: Joi.string().max(50).optional().allow(''),
  businessState: Joi.string().max(50).optional().allow(''),
  businessPincode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Pincode must be 6 digits'
    }),
  businessCountry: Joi.string().max(50).optional().allow('')
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 50 characters',
      'any.required': 'New password is required'
    })
});

const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'any.required': 'User status (isActive) is required'
    })
});

const userIdParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'any.required': 'User ID is required'
    })
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updateUserStatusSchema,
  userIdParamSchema
};