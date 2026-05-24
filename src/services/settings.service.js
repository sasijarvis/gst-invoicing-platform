const prisma = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errorTypes');
const { sanitizeString } = require('../utils/helpers');

class SettingsService {
  /**
   * Get user settings and business configuration
   */
  async getUserSettings(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        businessName: true,
        gstNumber: true,
        panNumber: true,
        businessAddress: true,
        businessCity: true,
        businessState: true,
        businessPincode: true,
        businessCountry: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get system preferences (these could be stored in a separate settings table)
    const systemSettings = {
      invoiceSettings: {
        defaultPaymentTerms: 30,
        defaultTaxRate: 18.0,
        autoInvoiceNumbering: true,
        invoicePrefix: 'INV',
        showBankDetails: true,
        defaultCurrency: 'INR'
      },
      emailSettings: {
        sendInvoiceEmail: true,
        sendPaymentReminders: true,
        reminderDaysBefore: [7, 3, 1],
        emailSignature: `Best regards,\n${user.businessName || user.firstName + ' ' + user.lastName}`
      },
      displaySettings: {
        dateFormat: 'DD/MM/YYYY',
        timeZone: 'Asia/Kolkata',
        currency: 'INR',
        thousandsSeparator: ',',
        decimalPlaces: 2
      },
      notificationSettings: {
        emailNotifications: true,
        smsNotifications: false,
        browserNotifications: true,
        weeklyReports: true,
        monthlyReports: true
      }
    };

    return {
      user,
      settings: systemSettings
    };
  }

  /**
   * Update user business information
   */
  async updateUserSettings(userId, updateData) {
    const { userInfo, settings } = updateData;

    // Update user information if provided
    let updatedUser = null;
    if (userInfo) {
      const sanitizedUserInfo = {
        ...(userInfo.firstName && { firstName: sanitizeString(userInfo.firstName) }),
        ...(userInfo.lastName && { lastName: sanitizeString(userInfo.lastName) }),
        ...(userInfo.phone && { phone: sanitizeString(userInfo.phone) }),
        ...(userInfo.businessName && { businessName: sanitizeString(userInfo.businessName) }),
        ...(userInfo.gstNumber && { gstNumber: sanitizeString(userInfo.gstNumber) }),
        ...(userInfo.panNumber && { panNumber: sanitizeString(userInfo.panNumber) }),
        ...(userInfo.businessAddress && { businessAddress: sanitizeString(userInfo.businessAddress) }),
        ...(userInfo.businessCity && { businessCity: sanitizeString(userInfo.businessCity) }),
        ...(userInfo.businessState && { businessState: sanitizeString(userInfo.businessState) }),
        ...(userInfo.businessPincode && { businessPincode: sanitizeString(userInfo.businessPincode) }),
        ...(userInfo.businessCountry && { businessCountry: sanitizeString(userInfo.businessCountry) })
      };

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: sanitizedUserInfo
      });
    }

    // For now, system settings are returned as-is since we don't have a separate settings table
    // In a production system, you might want to store these in a dedicated user_settings table
    
    return {
      user: updatedUser,
      settings: settings || null,
      message: 'Settings updated successfully'
    };
  }

  /**
   * Get system information
   */
  async getSystemInfo() {
    // Get database statistics
    const [
      totalUsers,
      totalCustomers,
      totalProducts,
      totalInvoices,
      totalPayments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.invoice.count(),
      prisma.payment.count()
    ]);

    return {
      system: {
        name: 'GST Invoicing Platform',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: 'MySQL',
        features: [
          'GST Compliance',
          'Invoice Management',
          'Payment Tracking',
          'Recurring Billing',
          'Business Analytics',
          'Customer Management',
          'Product Management'
        ]
      },
      statistics: {
        totalUsers,
        totalCustomers,
        totalProducts,
        totalInvoices,
        totalPayments
      },
      supportedFeatures: {
        gstCompliance: true,
        multiCurrency: false,
        recurringBilling: true,
        paymentGateways: false,
        emailIntegration: false,
        mobileApp: false,
        apiAccess: true,
        customReports: true
      },
      limits: {
        maxCustomers: null,
        maxInvoicesPerMonth: null,
        maxUsers: null,
        apiRateLimit: '100 requests per 15 minutes'
      }
    };
  }

  /**
   * Get invoice templates/preferences
   */
  async getInvoiceTemplates(userId) {
    // Basic template structure that frontend can use
    const defaultTemplate = {
      id: 'default',
      name: 'Default Template',
      isDefault: true,
      layout: {
        showLogo: true,
        showBusinessDetails: true,
        showCustomerDetails: true,
        showItemDetails: true,
        showTaxBreakdown: true,
        showPaymentTerms: true,
        showNotes: true
      },
      styling: {
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        headerSize: 24
      },
      fields: {
        businessName: true,
        businessAddress: true,
        gstNumber: true,
        panNumber: true,
        customerGst: true,
        itemHsnSac: true,
        itemTaxRate: true,
        paymentTerms: true,
        bankDetails: false
      }
    };

    return [defaultTemplate];
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(userId, limit = 10) {
    const [recentInvoices, recentPayments, recentCustomers] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true } }
        }
      }),
      prisma.payment.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          createdAt: true,
          customer: { select: { name: true } },
          invoice: { select: { invoiceNumber: true } }
        }
      }),
      prisma.customer.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      })
    ]);

    // Combine and sort all activities
    const activities = [
      ...recentInvoices.map(invoice => ({
        type: 'invoice',
        action: 'created',
        entity: 'Invoice',
        description: `Invoice ${invoice.invoiceNumber} created for ${invoice.customer.name}`,
        amount: invoice.totalAmount,
        status: invoice.status,
        timestamp: invoice.createdAt,
        id: invoice.id
      })),
      ...recentPayments.map(payment => ({
        type: 'payment',
        action: 'received',
        entity: 'Payment',
        description: `Payment of ₹${payment.amount} received from ${payment.customer.name}`,
        amount: payment.amount,
        method: payment.paymentMethod,
        timestamp: payment.createdAt,
        id: payment.id
      })),
      ...recentCustomers.map(customer => ({
        type: 'customer',
        action: 'created',
        entity: 'Customer',
        description: `New customer ${customer.name} added`,
        timestamp: customer.createdAt,
        id: customer.id
      }))
    ];

    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Global search across all entities
   */
  async globalSearch(userId, query, limit = 20) {
    if (!query || query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    const [customers, products, invoices, payments] = await Promise.all([
      prisma.customer.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
            { gstNumber: { contains: query } }
          ]
        },
        take: Math.floor(limit / 4),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          state: true
        }
      }),
      prisma.product.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
            { category: { contains: query } },
            { hsnCode: { contains: query } },
            { sacCode: { contains: query } }
          ]
        },
        take: Math.floor(limit / 4),
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          price: true,
          category: true
        }
      }),
      prisma.invoice.findMany({
        where: {
          userId,
          OR: [
            { invoiceNumber: { contains: query } },
            { notes: { contains: query } },
            { customer: { name: { contains: query } } }
          ]
        },
        take: Math.floor(limit / 4),
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          invoiceDate: true,
          customer: { select: { name: true } }
        }
      }),
      prisma.payment.findMany({
        where: {
          userId,
          OR: [
            { reference: { contains: query } },
            { notes: { contains: query } },
            { customer: { name: { contains: query } } }
          ]
        },
        take: Math.floor(limit / 4),
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          paymentDate: true,
          reference: true,
          customer: { select: { name: true } }
        }
      })
    ]);

    return {
      query,
      results: {
        customers: customers.map(customer => ({ ...customer, type: 'customer' })),
        products: products.map(product => ({ ...product, type: 'product' })),
        invoices: invoices.map(invoice => ({ ...invoice, type: 'invoice' })),
        payments: payments.map(payment => ({ ...payment, type: 'payment' }))
      },
      totalFound: customers.length + products.length + invoices.length + payments.length
    };
  }
}

module.exports = new SettingsService();