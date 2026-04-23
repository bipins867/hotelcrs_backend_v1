const s3 = require("../config/aws");
const { getFileBucketName } = require("../helper/upload");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const { getSignedUrl, getBulkSignedUrls } = require("../utils/s3Helper");
const path = require("path");
require("dotenv").config();

function sanitizeFileName(name) {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\.-]/g, "");
}

exports.uploadFile = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return errorResponse(res, "No file found", null, 400);
    }

    // Validate total size (additional check)
    const maxTotalSize = parseInt(process.env.MAX_TOTAL_SIZE) || 100 * 1024 * 1024; // 100MB default
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    if (totalSize > maxTotalSize) {
      return errorResponse(
        res,
        `Total file size exceeds limit. Maximum total size is ${maxTotalSize / (1024 * 1024)}MB`,
        null,
        413
      );
    }
    
    const uploadPromises = files.map((file, index) => {
      try {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const cleanBaseName = sanitizeFileName(baseName);

        const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${index}`;
        const fileName = `${uniqueSuffix}-${cleanBaseName}${ext}`;

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        };

        return new Promise((resolve, reject) => {
          s3.upload(params, (err, data) => {
            if (err) {
              reject({ file: file.originalname, error: err.message });
            } else {
              resolve({
                fileName: data.Key,
                fileUrl: data.Location,
                originalName: file.originalname,
                size: file.size,
              });
            }
          });
        });
      } catch (error) {
        return Promise.reject({ file: file.originalname, error: error.message });
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    
    const uploadedFiles = [];
    const errors = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        uploadedFiles.push(result.value);
      } else {
        errors.push({
          file: files[index]?.originalname || 'Unknown',
          error: result.reason?.error || result.reason || 'Upload failed'
        });
      }
    });

    if (uploadedFiles.length === 0) {
      return errorResponse(
        res,
        "All file uploads failed",
        { errors },
        500
      );
    }

    if (errors.length > 0) {
      // Some files succeeded, some failed
      return res.status(207).json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully, ${errors.length} file(s) failed`,
        data: uploadedFiles,
        errors: errors
      });
    }

    successResponse(res, "File uploaded successfully", uploadedFiles);
  } catch (error) {
    console.error('Upload error:', error);
    errorResponse(res, "Something went wrong", error.message);
  }
};

exports.getFile = async (req, res) => {
  try {
    const { fileName, key } = req.body;
    const bucketName = getFileBucketName(key);

    if (!fileName) {
      return errorResponse(res, "File name is required", null, 400);
    }

    const fileUrl = getSignedUrl(fileName, 'getObject', 3600, bucketName);
    successResponse(res, "File fetched successfully", { fileUrl });
  } catch (error) {
    errorResponse(res, "Something went wrong", error.message, 500);
  }
};

exports.getBulkFile = async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName || !Array.isArray(fileName) || fileName.length === 0) {
      return errorResponse(
        res,
        "fileName must be a non-empty array",
        null,
        400
      );
    }

    const fileUrls = await getBulkSignedUrls(fileName);
    successResponse(res, "Files fetched successfully", fileUrls);
  } catch (error) {
    errorResponse(res, "Something went wrong", error.message, 500);
  }
};
