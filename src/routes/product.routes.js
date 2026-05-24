const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import validation schemas
const {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productQuerySchema,
  productSearchSchema,
  stockUpdateSchema,
  bulkUpdateSchema
} = require('../validations/product.validation');

// Import controller
const productController = require('../controllers/product.controller');

const router = express.Router();

// All product routes require authentication
router.use(authenticateToken);

// Get product statistics
router.get('/stats',
  logActivity('VIEW_PRODUCT_STATS', 'product'),
  productController.getProductStats
);

// Get product categories
router.get('/categories',
  logActivity('VIEW_PRODUCT_CATEGORIES', 'product'),
  productController.getCategories
);

// Get low stock products
router.get('/low-stock',
  logActivity('VIEW_LOW_STOCK_PRODUCTS', 'product'),
  productController.getLowStockProducts
);

// Search products
router.get('/search',
  validateQuery(productSearchSchema),
  logActivity('SEARCH_PRODUCTS', 'product'),
  productController.searchProducts
);

// Bulk update products
router.put('/bulk-update',
  validateRequest(bulkUpdateSchema),
  logActivity('BULK_UPDATE_PRODUCTS', 'product'),
  productController.bulkUpdateProducts
);

// Get all products with filtering and pagination
router.get('/',
  validateQuery(productQuerySchema),
  logActivity('VIEW_PRODUCTS', 'product'),
  productController.getProducts
);

// Get product by ID
router.get('/:id',
  validateParams(productIdParamSchema),
  logActivity('VIEW_PRODUCT', 'product'),
  productController.getProductById
);

// Create new product
router.post('/',
  validateRequest(createProductSchema),
  logActivity('CREATE_PRODUCT', 'product'),
  productController.createProduct
);

// Update product
router.put('/:id',
  validateParams(productIdParamSchema),
  validateRequest(updateProductSchema),
  logActivity('UPDATE_PRODUCT', 'product'),
  productController.updateProduct
);

// Update product stock
router.patch('/:id/stock',
  validateParams(productIdParamSchema),
  validateRequest(stockUpdateSchema),
  logActivity('UPDATE_PRODUCT_STOCK', 'product'),
  productController.updateStock
);

// Delete product
router.delete('/:id',
  validateParams(productIdParamSchema),
  logActivity('DELETE_PRODUCT', 'product'),
  productController.deleteProduct
);

module.exports = router;