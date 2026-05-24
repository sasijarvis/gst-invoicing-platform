const productService = require('../services/product.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

class ProductController {
  /**
   * Create new product/service
   */
  createProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.user.id, req.body);
    successResponse(res, product, 'Product created successfully', 201);
  })

  /**
   * Get all products with pagination and filtering
   */
  getProducts = asyncHandler(async (req, res) => {
    const result = await productService.getProducts(req.user.id, req.query);
    paginatedResponse(res, result.products, result.pagination, 'Products retrieved successfully');
  })

  /**
   * Get product by ID
   */
  getProductById = asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.user.id, req.params.id);
    successResponse(res, product, 'Product retrieved successfully');
  })

  /**
   * Update product
   */
  updateProduct = asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(req.user.id, req.params.id, req.body);
    successResponse(res, product, 'Product updated successfully');
  })

  /**
   * Delete product
   */
  deleteProduct = asyncHandler(async (req, res) => {
    const result = await productService.deleteProduct(req.user.id, req.params.id);
    successResponse(res, result, result.message);
  })

  /**
   * Search products
   */
  searchProducts = asyncHandler(async (req, res) => {
    const { q, type, limit } = req.query;
    const products = await productService.searchProducts(req.user.id, q, type, parseInt(limit));
    successResponse(res, products, 'Search completed successfully');
  })

  /**
   * Update product stock
   */
  updateStock = asyncHandler(async (req, res) => {
    const { stockQuantity, reason } = req.body;
    const product = await productService.updateStock(req.user.id, req.params.id, stockQuantity, reason);
    successResponse(res, product, 'Stock updated successfully');
  })

  /**
   * Get products with low stock
   */
  getLowStockProducts = asyncHandler(async (req, res) => {
    const products = await productService.getLowStockProducts(req.user.id);
    successResponse(res, products, 'Low stock products retrieved successfully');
  })

  /**
   * Get product categories
   */
  getCategories = asyncHandler(async (req, res) => {
    const categories = await productService.getCategories(req.user.id);
    successResponse(res, categories, 'Categories retrieved successfully');
  })

  /**
   * Bulk update products
   */
  bulkUpdateProducts = asyncHandler(async (req, res) => {
    const { productIds, updates } = req.body;
    const result = await productService.bulkUpdateProducts(req.user.id, productIds, updates);
    successResponse(res, result, 'Products updated successfully');
  })

  /**
   * Get product statistics
   */
  getProductStats = asyncHandler(async (req, res) => {
    const stats = await productService.getProductStats(req.user.id);
    successResponse(res, stats, 'Product statistics retrieved successfully');
  })
}

module.exports = new ProductController();