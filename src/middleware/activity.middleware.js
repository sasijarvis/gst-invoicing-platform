const prisma = require('../config/database');
const logger = require('../services/logger.service');

/**
 * Log user activities to database
 */
const logActivity = (action, entity) => {
  return async (req, res, next) => {
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to capture response
    res.json = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log activity asynchronously (don't wait for it)
        setImmediate(async () => {
          try {
            if (req.user) {
              // Prepare activity log data
              const activityData = {
                action,
                entity,
                details: JSON.stringify({
                  method: req.method,
                  url: req.originalUrl,
                  statusCode: res.statusCode
                }),
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                user: {
                  connect: {
                    id: req.user.id
                  }
                }
              };

              // Only add entityId if it exists (for specific entity operations)
              if (req.params.id) {
                activityData.entityId = req.params.id;
              }

              await prisma.activityLog.create({
                data: activityData
              });
            }
          } catch (error) {
            logger.error('Failed to log activity:', error);
          }
        });
      }
      
      // Call original res.json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  logActivity
};