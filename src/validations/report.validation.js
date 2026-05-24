const Joi = require('joi');

const dateRangeSchema = Joi.object({
  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Start date is required'
    }),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required'
    })
});

const salesReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
  customerId: Joi.string().optional(),
  productId: Joi.string().optional(),
  status: Joi.string().valid('DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED').optional(),
  includeDetails: Joi.boolean().default(false)
});

const gstReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  reportType: Joi.string().valid('GSTR1', 'GSTR3B', 'summary').default('summary'),
  state: Joi.string().optional(),
  includeZeroRated: Joi.boolean().default(true)
});

const agingReportSchema = Joi.object({
  asOfDate: Joi.date().default(() => new Date()),
  customerId: Joi.string().optional(),
  includePaid: Joi.boolean().default(false),
  agingBuckets: Joi.array().items(Joi.number().min(0)).default([30, 60, 90, 120])
});

const profitLossSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  groupBy: Joi.string().valid('month', 'quarter', 'year').default('month'),
  includeRecurring: Joi.boolean().default(true)
});

const customerAnalyticsSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  customerId: Joi.string().optional(),
  metrics: Joi.alternatives().try(
    Joi.array().items(
      Joi.string().valid('revenue', 'invoices', 'payments', 'outstanding', 'frequency')
    ),
    Joi.string().custom((value, helpers) => {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // If not array, split by comma
        return value.split(',').map(item => item.trim());
      } catch {
        // If JSON parsing fails, split by comma
        return value.split(',').map(item => item.trim());
      }
    })
  ).default(['revenue', 'invoices', 'payments']),
  limit: Joi.number().min(1).max(100).default(10)
});

const productAnalyticsSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  productId: Joi.string().optional(),
  type: Joi.string().valid('PRODUCT', 'SERVICE').optional(),
  category: Joi.string().optional(),
  metrics: Joi.alternatives().try(
    Joi.array().items(
      Joi.string().valid('revenue', 'quantity', 'invoices', 'customers')
    ),
    Joi.string().custom((value, helpers) => {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // If not array, split by comma
        return value.split(',').map(item => item.trim());
      } catch {
        // If JSON parsing fails, split by comma
        return value.split(',').map(item => item.trim());
      }
    })
  ).default(['revenue', 'quantity']),
  limit: Joi.number().min(1).max(100).default(10)
});

const dashboardSchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year').default('month'),
  compareWith: Joi.string().valid('previous', 'lastYear').optional(),
  includeForecasting: Joi.boolean().default(false)
});

const exportReportSchema = Joi.object({
  reportType: Joi.string().valid('sales', 'gst', 'aging', 'profitLoss', 'customers', 'products').required(),
  format: Joi.string().valid('pdf', 'excel', 'csv').required(),
  params: Joi.object().required(),
  email: Joi.string().email().optional(),
  fileName: Joi.string().max(100).optional()
});

const trendsAnalysisSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  metric: Joi.string().valid('revenue', 'invoices', 'customers', 'products', 'payments').required(),
  granularity: Joi.string().valid('day', 'week', 'month').default('month'),
  includeForecast: Joi.boolean().default(false),
  forecastPeriods: Joi.number().min(1).max(12).default(3)
});

module.exports = {
  dateRangeSchema,
  salesReportSchema,
  gstReportSchema,
  agingReportSchema,
  profitLossSchema,
  customerAnalyticsSchema,
  productAnalyticsSchema,
  dashboardSchema,
  exportReportSchema,
  trendsAnalysisSchema
};