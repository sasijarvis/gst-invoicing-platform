const path = require('path');
const fs = require('fs').promises;
const { ValidationError, NotFoundError } = require('../utils/errorTypes');

class UploadService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.allowedFileTypes = {
      images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      documents: ['.pdf', '.doc', '.docx', '.txt'],
      all: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt']
    };
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
  }

  /**
   * Initialize upload directory
   */
  async initializeUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['logos', 'documents', 'temp'];
    for (const subdir of subdirs) {
      const subdirPath = path.join(this.uploadDir, subdir);
      try {
        await fs.access(subdirPath);
      } catch {
        await fs.mkdir(subdirPath, { recursive: true });
      }
    }
  }

  /**
   * Validate file
   */
  validateFile(file, type = 'all') {
    if (!file) {
      throw new ValidationError('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new ValidationError(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file type
    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedTypes = this.allowedFileTypes[type] || this.allowedFileTypes.all;
    
    if (!allowedTypes.includes(fileExt)) {
      throw new ValidationError(`File type ${fileExt} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return true;
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName, userId) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId}_${timestamp}_${random}${ext}`;
  }

  /**
   * Save file
   */
  async saveFile(file, userId, category = 'documents') {
    await this.initializeUploadDirectory();
    this.validateFile(file, category === 'logos' ? 'images' : 'all');

    const filename = this.generateFilename(file.originalname, userId);
    const filePath = path.join(this.uploadDir, category, filename);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Return file information
    return {
      id: `${category}_${filename}`,
      originalName: file.originalname,
      filename,
      path: filePath,
      size: file.size,
      mimetype: file.mimetype,
      category,
      url: `/api/uploads/${category}/${filename}`,
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Get file
   */
  async getFile(category, filename) {
    const filePath = path.join(this.uploadDir, category, filename);
    
    try {
      await fs.access(filePath);
      return {
        path: filePath,
        exists: true
      };
    } catch {
      throw new NotFoundError('File not found');
    }
  }

  /**
   * Delete file
   */
  async deleteFile(category, filename) {
    const filePath = path.join(this.uploadDir, category, filename);
    
    try {
      await fs.unlink(filePath);
      return { message: 'File deleted successfully' };
    } catch {
      throw new NotFoundError('File not found');
    }
  }

  /**
   * Get user files
   */
  async getUserFiles(userId, category = null) {
    await this.initializeUploadDirectory();
    
    const categories = category ? [category] : ['logos', 'documents'];
    const userFiles = [];

    for (const cat of categories) {
      const categoryPath = path.join(this.uploadDir, cat);
      try {
        const files = await fs.readdir(categoryPath);
        const userCategoryFiles = files.filter(file => file.startsWith(`${userId}_`));
        
        for (const file of userCategoryFiles) {
          const filePath = path.join(categoryPath, file);
          const stats = await fs.stat(filePath);
          
          userFiles.push({
            id: `${cat}_${file}`,
            filename: file,
            category: cat,
            size: stats.size,
            url: `/api/uploads/${cat}/${file}`,
            uploadedAt: stats.birthtime
          });
        }
      } catch {
        // Category directory doesn't exist or is empty
      }
    }

    return userFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }
}

module.exports = new UploadService();