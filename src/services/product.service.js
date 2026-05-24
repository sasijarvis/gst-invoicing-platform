const prisma = require('../config/database');
const { sanitizeString } = require('../utils/helpers');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errorTypes');

class ProductService {
  /**
   * Create new product/service
   */
  async createProduct(userId, productData) {
    // Sanitize string inputs
    const sanitizedData = {
      ...productData,
      name: sanitizeString(productData.name),
      description: sanitizeString(productData.description || ''),
      unit: sanitizeString(productData.unit || 'Nos'),
      category: sanitizeString(productData.category || '')
    };

    // Validate HSN/SAC codes based on type
    if (sanitizedData.type === 'PRODUCT' && sanitizedData.hsnCode) {
      if (!/^[0-9]{4,8}$/.test(sanitizedData.hsnCode)) {
        throw new ValidationError('HSN code must be 4 to 8 digits for products');
      }
    }

    if (sanitizedData.type === 'SERVICE' && sanitizedData.sacCode) {
      if (!/^[0-9]{6}$/.test(sanitizedData.sacCode)) {
        throw new ValidationError('SAC code must be exactly 6 digits for services');
      }
    }

    // Check for duplicate product name for same user
    const existingProduct = await prisma.product.findFirst({
      where: {
        userId,
        name: sanitizedData.name,
        isActive: true
      }
    });

    if (existingProduct) {
      throw new ConflictError('Product with this name already exists');
    }

    // Set stock-related fields to null for services
    if (sanitizedData.type === 'SERVICE') {
      sanitizedData.stockQuantity = null;
      sanitizedData.lowStockAlert = null;
      sanitizedData.hsnCode = null;
    } else {
      sanitizedData.sacCode = null;
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        ...sanitizedData,
        userId
      }
    });

    return product;
  }

  /**
   * Get all products for a user with pagination and filtering
   */
  async getProducts(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      category = '',
      isActive,
      lowStock = false,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    // Convert to proper types
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Convert boolean strings to actual booleans
    let isActiveBool = isActive;
    if (typeof isActive === 'string') {
      isActiveBool = isActive === 'true';
    }
    
    let lowStockBool = lowStock;
    if (typeof lowStock === 'string') {
      lowStockBool = lowStock === 'true';
    }

    // Build where clause
    const where = {
      userId,
      ...(isActiveBool !== undefined && { isActive: isActiveBool }),
      ...(type && { type }),
      ...(category && { category: { contains: category } }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { category: { contains: search } },
          { hsnCode: { contains: search } },
          { sacCode: { contains: search } }
        ]
      })
    };

    // Add low stock filter for products only
    if (lowStockBool) {
      where.AND = [
        { type: 'PRODUCT' },
        { stockQuantity: { lte: prisma.product.fields.lowStockAlert } }
      ];
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              invoiceItems: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    };
  }

  /**
   * Get product by ID
   */
  async getProductById(userId, productId) {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId
      },
      include: {
        _count: {
          select: {
            invoiceItems: true
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  /**
   * Update product
   */
  async updateProduct(userId, productId, updateData) {
    // Check if product exists and belongs to user
    const existingProduct = await this.getProductById(userId, productId);

    // Sanitize string inputs
    const sanitizedData = {
      ...updateData,
      ...(updateData.name && { name: sanitizeString(updateData.name) }),
      ...(updateData.description && { description: sanitizeString(updateData.description) }),
      ...(updateData.unit && { unit: sanitizeString(updateData.unit) }),
      ...(updateData.category && { category: sanitizeString(updateData.category) })
    };

    // If type is being changed, validate HSN/SAC codes accordingly
    const newType = sanitizedData.type || existingProduct.type;
    
    if (newType === 'PRODUCT') {
      if (sanitizedData.hsnCode && !/^[0-9]{4,8}$/.test(sanitizedData.hsnCode)) {
        throw new ValidationError('HSN code must be 4 to 8 digits for products');
      }
      // Clear SAC code for products
      if (sanitizedData.type === 'PRODUCT') {
        sanitizedData.sacCode = null;
      }
    }

    if (newType === 'SERVICE') {
      if (sanitizedData.sacCode && !/^[0-9]{6}$/.test(sanitizedData.sacCode)) {
        throw new ValidationError('SAC code must be exactly 6 digits for services');
      }
      // Clear HSN and stock fields for services
      if (sanitizedData.type === 'SERVICE') {
        sanitizedData.hsnCode = null;
        sanitizedData.stockQuantity = null;
        sanitizedData.lowStockAlert = null;
      }
    }

    // Check for duplicate name if name is being changed
    if (sanitizedData.name && sanitizedData.name !== existingProduct.name) {
      const duplicateProduct = await prisma.product.findFirst({
        where: {
          userId,
          name: sanitizedData.name,
          isActive: true,
          NOT: { id: productId }
        }
      });

      if (duplicateProduct) {
        throw new ConflictError('Product with this name already exists');
      }
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: productId },
      data: sanitizedData
    });

    return product;
  }

  /**
   * Delete product (soft delete by marking inactive)
   */
  async deleteProduct(userId, productId) {
    // Check if product exists and belongs to user
    await this.getProductById(userId, productId);

    // Check if product is used in any invoice items
    const invoiceItemCount = await prisma.invoiceItem.count({
      where: { productId }
    });

    if (invoiceItemCount > 0) {
      // Soft delete - mark as inactive
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false }
      });

      return { 
        message: 'Product has been used in invoices and has been marked as inactive',
        type: 'soft_delete'
      };
    } else {
      // Hard delete if not used in any invoices
      await prisma.product.delete({
        where: { id: productId }
      });

      return { 
        message: 'Product deleted successfully',
        type: 'hard_delete'
      };
    }
  }

  /**
   * Search products
   */
  async searchProducts(userId, query, type = null, limit = 10) {
    const where = {
      userId,
      isActive: true,
      ...(type && { type }),
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { category: { contains: query } },
        { hsnCode: { contains: query } },
        { sacCode: { contains: query } }
      ]
    };

    const products = await prisma.product.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        price: true,
        unit: true,
        hsnCode: true,
        sacCode: true,
        taxRate: true,
        category: true,
        stockQuantity: true
      }
    });

    return products;
  }

  /**
   * Update stock quantity for a product
   */
  async updateStock(userId, productId, stockQuantity, reason = '') {
    // Check if product exists and belongs to user
    const product = await this.getProductById(userId, productId);

    if (product.type !== 'PRODUCT') {
      throw new ValidationError('Stock can only be updated for products, not services');
    }

    // Update stock
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity }
    });

    // Log stock movement (could be implemented as a separate table)
    // For now, we'll just return the updated product

    return updatedProduct;
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(userId) {
    const products = await prisma.product.findMany({
      where: {
        userId,
        type: 'PRODUCT',
        isActive: true,
        stockQuantity: {
          lte: prisma.product.fields.lowStockAlert
        }
      },
      orderBy: { stockQuantity: 'asc' }
    });

    return products;
  }

  /**
   * Get product categories
   */
  async getCategories(userId) {
    const categories = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
        category: {
          not: null,
          not: ''
        }
      },
      select: {
        category: true
      },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    return categories.map(item => item.category);
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(userId, productIds, updates) {
    // Verify all products belong to the user
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId
      },
      select: { id: true }
    });

    const foundIds = products.map(p => p.id);
    const notFoundIds = productIds.filter(id => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundError(`Products not found: ${notFoundIds.join(', ')}`);
    }

    // Perform bulk update
    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
        userId
      },
      data: updates
    });

    return {
      updated: result.count,
      total: productIds.length
    };
  }

  /**
   * Get product statistics
   */
  async getProductStats(userId) {
    const [
      totalStats,
      typeStats,
      lowStockCount
    ] = await Promise.all([
      prisma.product.groupBy({
        by: ['isActive'],
        where: { userId },
        _count: true
      }),
      prisma.product.groupBy({
        by: ['type'],
        where: { userId, isActive: true },
        _count: true
      }),
      prisma.product.count({
        where: {
          userId,
          type: 'PRODUCT',
          isActive: true,
          stockQuantity: {
            lte: prisma.product.fields.lowStockAlert
          }
        }
      })
    ]);

    const totalProducts = totalStats.reduce((sum, stat) => sum + stat._count, 0);
    const activeProducts = totalStats.find(stat => stat.isActive)?._count || 0;
    const inactiveProducts = totalStats.find(stat => !stat.isActive)?._count || 0;
    
    const products = typeStats.find(stat => stat.type === 'PRODUCT')?._count || 0;
    const services = typeStats.find(stat => stat.type === 'SERVICE')?._count || 0;

    return {
      total: totalProducts,
      active: activeProducts,
      inactive: inactiveProducts,
      products,
      services,
      lowStock: lowStockCount
    };
  }
}

module.exports = new ProductService();