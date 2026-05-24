const uploadService = require('../services/upload.service');
const { successResponse, errorResponse } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

class UploadController {
  /**
   * Upload file
   */
  uploadFile = [
    upload.single('file'),
    asyncHandler(async (req, res) => {
      const { category = 'documents' } = req.body;
      const fileInfo = await uploadService.saveFile(req.file, req.user.id, category);
      successResponse(res, fileInfo, 'File uploaded successfully', 201);
    })
  ]

  /**
   * Get file
   */
  getFile = asyncHandler(async (req, res) => {
    const { category, filename } = req.params;
    const file = await uploadService.getFile(category, filename);
    
    // Send file
    res.sendFile(file.path);
  })

  /**
   * Delete file
   */
  deleteFile = asyncHandler(async (req, res) => {
    const { category, filename } = req.params;
    
    // Check if file belongs to user (basic security)
    if (!filename.startsWith(`${req.user.id}_`)) {
      return errorResponse(res, 'Unauthorized to delete this file', 403);
    }
    
    const result = await uploadService.deleteFile(category, filename);
    successResponse(res, result, result.message);
  })

  /**
   * Get user files
   */
  getUserFiles = asyncHandler(async (req, res) => {
    const { category } = req.query;
    const files = await uploadService.getUserFiles(req.user.id, category);
    successResponse(res, files, 'Files retrieved successfully');
  })
}

module.exports = new UploadController();