const multer = require('multer');

// Configure multer to store file in memory
const storage = multer.memoryStorage();

// File size limits (configurable via environment variables)
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // Default: 10MB per file
const maxFiles = parseInt(process.env.MAX_FILES) || 20; // Default: 20 files

const upload = multer({
  storage: storage,
  limits: {
    fileSize: maxFileSize, // Maximum file size (bytes)
    files: maxFiles, // Maximum number of files
    fieldSize: maxFileSize, // Maximum field size
  },
  // Custom error handler for file size errors
  fileFilter: (req, file, cb) => {
    // Accept all file types, but you can add filtering here if needed
    cb(null, true);
  }
});

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          message: `File too large. Maximum file size is ${maxFileSize / (1024 * 1024)}MB`,
          code: 'LIMIT_FILE_SIZE'
        }
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: {
          message: `Too many files. Maximum ${maxFiles} files allowed`,
          code: 'LIMIT_FILE_COUNT'
        }
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: {
          message: 'Unexpected file field',
          code: 'LIMIT_UNEXPECTED_FILE'
        }
      });
    }
    return res.status(400).json({
      error: {
        message: `Upload error: ${err.message}`,
        code: err.code
      }
    });
  }
  if (err) {
    return res.status(500).json({
      error: {
        message: err.message || 'File upload error'
      }
    });
  }
  next();
};

module.exports = { upload, handleMulterError };