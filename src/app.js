const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const config = require('./config/env');
const corsMiddleware = require('./middleware/cors.middleware');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFound } = require('./middleware/errorHandler.middleware');
const logger = require('./services/logger.service');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const customerRoutes = require('./routes/customer.routes');
const productRoutes = require('./routes/product.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');
const recurringInvoiceRoutes = require('./routes/recurringInvoice.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportsRoutes = require('./routes/reports.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const settingsRoutes = require('./routes/settings.routes');
const systemRoutes = require('./routes/system.routes');
const uploadRoutes = require('./routes/upload.routes');
const subscriptionPlanRoutes = require('./routes/subscriptionPlan.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(corsMiddleware);

// Compression
app.use(compression());

// Rate limiting
app.use(generalLimiter);

// Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (for getting real IP addresses)
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GST Invoicing API is running',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recurring-invoices', recurringInvoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  const message = `🚀 GST Invoicing API Server running on port ${PORT}`;
  const environment = `📊 Environment: ${config.NODE_ENV}`;
  const healthCheck = `🔗 Health check: http://localhost:${PORT}/health`;
  
  console.log(message);
  console.log(environment);
  console.log(healthCheck);
  
  logger.info('Server started', {
    port: PORT,
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;