const prisma = require('../config/database');
const { validateGSTNumber, validatePAN, sanitizeString } = require('../utils/helpers');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errorTypes');

class CustomerService {
  /**
   * Create new customer
   */
  async createCustomer(userId, customerData) {
    // Sanitize string inputs
    const sanitizedData = {
      ...customerData,
      name: sanitizeString(customerData.name),
      email: customerData.email?.toLowerCase() || null,
      contactPerson: sanitizeString(customerData.contactPerson || ''),
      notes: sanitizeString(customerData.notes || ''),
      address: sanitizeString(customerData.address || ''),
      city: sanitizeString(customerData.city || ''),
      state: sanitizeString(customerData.state || '')
    };

    // Validate GST and PAN numbers if provided
    if (sanitizedData.gstNumber && !validateGSTNumber(sanitizedData.gstNumber)) {
      throw new Error('Invalid GST number format');
    }

    if (sanitizedData.panNumber && !validatePAN(sanitizedData.panNumber)) {
      throw new Error('Invalid PAN number format');
    }

    // Check for duplicate customer (same name + email/phone for same user)
    const existingCustomer = await this.checkDuplicateCustomer(
      userId, 
      sanitizedData.name, 
      sanitizedData.email, 
      sanitizedData.phone
    );

    if (existingCustomer) {
      throw new ConflictError('Customer with similar details already exists');
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        ...sanitizedData,
        userId
      }
    });

    return customer;
  }

  /**
   * Get all customers for a user with pagination and filtering
   */
  async getCustomers(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      state = '',
      isActive,
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

    // Build where clause
    const where = {
      userId,
      ...(isActiveBool !== undefined && { isActive: isActiveBool }),
      ...(state && { state: { contains: state } }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { contactPerson: { contains: search } },
          { gstNumber: { contains: search } }
        ]
      })
    };

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              invoices: true,
              payments: true
            }
          }
        }
      }),
      prisma.customer.count({ where })
    ]);

    return {
      customers,
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
   * Get customer by ID
   */
  async getCustomerById(userId, customerId) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId
      },
      include: {
        _count: {
          select: {
            invoices: true,
            payments: true
          }
        }
      }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  /**
   * Update customer
   */
  async updateCustomer(userId, customerId, updateData) {
    // Check if customer exists and belongs to user
    const existingCustomer = await this.getCustomerById(userId, customerId);

    // Sanitize string inputs
    const sanitizedData = {
      ...updateData,
      ...(updateData.name && { name: sanitizeString(updateData.name) }),
      ...(updateData.email && { email: updateData.email.toLowerCase() }),
      ...(updateData.contactPerson && { contactPerson: sanitizeString(updateData.contactPerson) }),
      ...(updateData.notes && { notes: sanitizeString(updateData.notes) }),
      ...(updateData.address && { address: sanitizeString(updateData.address) }),
      ...(updateData.city && { city: sanitizeString(updateData.city) }),
      ...(updateData.state && { state: sanitizeString(updateData.state) })
    };

    // Validate GST and PAN numbers if provided
    if (sanitizedData.gstNumber && !validateGSTNumber(sanitizedData.gstNumber)) {
      throw new Error('Invalid GST number format');
    }

    if (sanitizedData.panNumber && !validatePAN(sanitizedData.panNumber)) {
      throw new Error('Invalid PAN number format');
    }

    // Check for duplicate if name/email/phone is being changed
    if (sanitizedData.name || sanitizedData.email || sanitizedData.phone) {
      const duplicateCustomer = await this.checkDuplicateCustomer(
        userId,
        sanitizedData.name || existingCustomer.name,
        sanitizedData.email || existingCustomer.email,
        sanitizedData.phone || existingCustomer.phone,
        customerId // Exclude current customer from check
      );

      if (duplicateCustomer) {
        throw new ConflictError('Customer with similar details already exists');
      }
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: sanitizedData
    });

    return customer;
  }

  /**
   * Delete customer (soft delete by marking inactive)
   */
  async deleteCustomer(userId, customerId) {
    // Check if customer exists and belongs to user
    await this.getCustomerById(userId, customerId);

    // Check if customer has any invoices
    const invoiceCount = await prisma.invoice.count({
      where: { customerId }
    });

    if (invoiceCount > 0) {
      // Soft delete - mark as inactive
      await prisma.customer.update({
        where: { id: customerId },
        data: { isActive: false }
      });

      return { 
        message: 'Customer has existing invoices and has been marked as inactive',
        type: 'soft_delete'
      };
    } else {
      // Hard delete if no invoices
      await prisma.customer.delete({
        where: { id: customerId }
      });

      return { 
        message: 'Customer deleted successfully',
        type: 'hard_delete'
      };
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(userId, query, limit = 10) {
    const customers = await prisma.customer.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { contactPerson: { contains: query } },
          { gstNumber: { contains: query } }
        ]
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        gstNumber: true
      }
    });

    return customers;
  }

  /**
   * Get customer invoices
   */
  async getCustomerInvoices(userId, customerId, options = {}) {
    // Verify customer belongs to user
    await this.getCustomerById(userId, customerId);

    const { page = 1, limit = 10 } = options;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { customerId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          status: true
        }
      }),
      prisma.invoice.count({ where: { customerId } })
    ]);

    return {
      invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get customer payments
   */
  async getCustomerPayments(userId, customerId, options = {}) {
    // Verify customer belongs to user
    await this.getCustomerById(userId, customerId);

    const { page = 1, limit = 10 } = options;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { customerId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true
            }
          }
        }
      }),
      prisma.payment.count({ where: { customerId } })
    ]);

    return {
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Check for duplicate customer
   */
  async checkDuplicateCustomer(userId, name, email, phone, excludeId = null) {
    const where = {
      userId,
      AND: [
        {
          OR: [
            { name: name },
            ...(email ? [{ email: email }] : []),
            ...(phone ? [{ phone: phone }] : [])
          ]
        }
      ],
      ...(excludeId && { NOT: { id: excludeId } })
    };

    return await prisma.customer.findFirst({ where });
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(userId) {
    const stats = await prisma.customer.groupBy({
      by: ['isActive'],
      where: { userId },
      _count: true
    });

    const totalCustomers = stats.reduce((sum, stat) => sum + stat._count, 0);
    const activeCustomers = stats.find(stat => stat.isActive)?._count || 0;
    const inactiveCustomers = stats.find(stat => !stat.isActive)?._count || 0;

    return {
      total: totalCustomers,
      active: activeCustomers,
      inactive: inactiveCustomers
    };
  }
}

module.exports = new CustomerService();