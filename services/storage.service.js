const fs = require('fs');
const path = require('path');

/**
 * Storage service for handling file uploads
 * Provides abstraction for local storage with option to swap to S3 later
 */
class StorageService {
  constructor() {
    this.baseUploadDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Ensures the upload directory exists
   * @param {string} dirPath - Directory path to create
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Stores uploaded files for a claim
   * @param {string} claimId - Unique claim identifier
   * @param {Array} files - Array of multer file objects
   * @returns {Array} Array of file metadata objects
   */
  async storeClaimDocuments(claimId, files) {
    const claimDir = path.join(this.baseUploadDir, 'claims', claimId);
    this.ensureDirectoryExists(claimDir);

    const fileMetadata = [];

    for (const file of files) {
      const sanitizedFilename = this.sanitizeFilename(file.originalname);
      const timestamp = Date.now();
      const filename = `${timestamp}-${sanitizedFilename}`;
      const filePath = path.join(claimDir, filename);

      // Move file to claim directory
      fs.renameSync(file.path, filePath);

      fileMetadata.push({
        filename: filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath
      });
    }

    return fileMetadata;
  }

  /**
   * Sanitizes filename to prevent path traversal and special characters
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    // Remove path separators and special characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.+/g, '.')
      .substring(0, 255); // Limit filename length
  }

  /**
   * Deletes claim documents (for rollback or claim deletion)
   * @param {string} claimId - Unique claim identifier
   */
  async deleteClaimDocuments(claimId) {
    const claimDir = path.join(this.baseUploadDir, 'claims', claimId);
    if (fs.existsSync(claimDir)) {
      fs.rmSync(claimDir, { recursive: true, force: true });
    }
  }

  /**
   * Gets the full URL/path for a document
   * @param {string} filePath - File path from metadata
   * @returns {string} Accessible URL or path
   */
  getDocumentUrl(filePath) {
    // For local storage, return the relative path
    // In production with S3, this would return the S3 URL
    return filePath.replace(this.baseUploadDir, '/uploads');
  }
}

module.exports = new StorageService();
