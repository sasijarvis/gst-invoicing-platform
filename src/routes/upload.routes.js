const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activity.middleware');

// Import controller
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

// All upload routes require authentication
router.use(authenticateToken);

// Upload file
router.post('/',
  logActivity('UPLOAD_FILE', 'upload'),
  ...uploadController.uploadFile
);

// Get user files
router.get('/',
  uploadController.getUserFiles
);

// Get specific file
router.get('/:category/:filename',
  uploadController.getFile
);

// Delete file
router.delete('/:category/:filename',
  logActivity('DELETE_FILE', 'upload'),
  uploadController.deleteFile
);

module.exports = router;