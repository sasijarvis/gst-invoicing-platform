const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateQuery, validateRequest } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  salesReportSchema,
  gstReportSchema,
  agingReportSchema,
  profitLossSchema,
  exportReportSchema
} = require('../validations/report.validation');

// Import controller
const reportsController = require('../controllers/reports.controller');

const router = express.Router();

// All report routes require authentication
router.use(authenticateToken);

// Generate sales report
router.get('/sales',
  validateQuery(salesReportSchema),
  logActivity('GENERATE_SALES_REPORT', 'report'),
  reportsController.getSalesReport
);

// Generate GST report
router.get('/gst',
  validateQuery(gstReportSchema),
  logActivity('GENERATE_GST_REPORT', 'report'),
  reportsController.getGSTReport
);

// Generate aging report
router.get('/aging',
  validateQuery(agingReportSchema),
  logActivity('GENERATE_AGING_REPORT', 'report'),
  reportsController.getAgingReport
);

// Generate profit & loss report
router.get('/profit-loss',
  validateQuery(profitLossSchema),
  logActivity('GENERATE_PL_REPORT', 'report'),
  reportsController.getProfitLossReport
);

// Export report
router.post('/export',
  validateRequest(exportReportSchema),
  logActivity('EXPORT_REPORT', 'report'),
  reportsController.exportReport
);

module.exports = router;