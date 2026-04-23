const s3 = require("../config/aws");
const path = require('path');
const mime = require('mime-types');

/**
 * Generate a signed URL for an S3 object
 * @param {string} fileName - The file name/key in S3 bucket
 * @param {string} operation - The S3 operation (default: 'getObject')
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
 * @returns {string} Signed URL for the S3 object
 */
const getSignedUrl = (fileName, operation = 'getObject', expiresIn = 3600, bucketName = null) => {
  try {
    if (!fileName) {
      throw new Error('File name is required');
    }

    const params = {
      Bucket: bucketName || process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Expires: expiresIn
    };

    return s3.getSignedUrl(operation, params);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Generate signed URLs for multiple S3 objects
 * @param {Array<string>} fileNames - Array of file names/keys in S3 bucket
 * @param {string} operation - The S3 operation (default: 'getObject')
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
 * @returns {Array<Object>} Array of objects with fileName and signed URL
 */
const getBulkSignedUrls = async (fileNames, operation = 'getObject', expiresIn = 3600, bucketName = null) => {
  try {
    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      throw new Error('File names must be a non-empty array');
    }

    return fileNames.map((fileName) => ({
      fileName,
      url: getSignedUrl(fileName, operation, expiresIn, bucketName)
    }));
  } catch (error) {
    console.error('Error generating bulk signed URLs:', error);
    throw error;
  }
};

/**
 * Generate a signed URL for uploading to S3 (PUT operation)
 * @param {string} fileName - The file name/key in S3 bucket
 * @param {string} contentType - The content type of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
 * @returns {string} Signed URL for uploading to S3
 */
const getUploadSignedUrl = (fileName, contentType, expiresIn = 3600, bucketName = null) => {
  try {
    if (!fileName) {
      throw new Error('File name is required');
    }

    if (!contentType) {
      throw new Error('Content type is required for upload URLs');
    }

    const params = {
      Bucket: bucketName || process.env.AWS_BUCKET_NAME,
      Key: fileName,
      ContentType: contentType,
      Expires: expiresIn
    };

    return s3.getSignedUrl('putObject', params);
  } catch (error) {
    console.error('Error generating upload signed URL:', error);
    throw error;
  }
};

/**
 * Get S3 object as base64 string (for embedding in emails with private buckets)
 * @param {string} fileName - The file name/key in S3 bucket
 * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
 * @returns {Promise<string>} Base64 encoded string with data URI
 */
const getObjectAsBase64 = async (fileName, bucketName = null) => {
  try {
    if (!fileName) {
      throw new Error('File name is required');
    }

    const params = {
      Bucket: bucketName || process.env.AWS_BUCKET_NAME,
      Key: fileName
    };

    const data = await s3.getObject(params).promise();
    let contentType = data.ContentType;
    if (!contentType || contentType === 'application/octet-stream') {
      const ext = path.extname(fileName);
      const guessedType = ext ? mime.lookup(ext) : null;
      if (guessedType) {
        contentType = guessedType;
      }
    }
    if (!contentType) {
      contentType = 'image/png';
    }
    const base64 = data.Body.toString('base64');

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error getting S3 object as base64:', error);
    throw error;
  }
};

/**
 * Download S3 object as buffer
 * @param {string} fileName - The file name/key in S3 bucket
 * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
 * @returns {Promise<Buffer>} File buffer
 */
const downloadObjectAsBuffer = async (fileName, bucketName = null) => {
  try {
    if (!fileName) {
      throw new Error('File name is required');
    }

    const params = {
      Bucket: bucketName || process.env.AWS_BUCKET_NAME,
      Key: fileName
    };

    const data = await s3.getObject(params).promise();
    return data.Body;
  } catch (error) {
    console.error('Error downloading S3 object as buffer:', error);
    throw error;
  }
};

/**
 * Extract S3 key from S3 URL
 * @param {string} s3Url - The S3 URL
 * @returns {string} S3 key
 */
const extractS3KeyFromUrl = (s3Url) => {
  try {
    if (!s3Url) {
      throw new Error('S3 URL is required');
    }

    // Handle different S3 URL formats
    // Format 1: https://bucket-name.s3.region.amazonaws.com/key
    // Format 2: https://s3.region.amazonaws.com/bucket-name/key
    // Format 3: https://s3.amazonaws.com/bucket-name/key

    const url = new URL(s3Url);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);

    // Remove bucket name from path parts (first part)
    if (pathParts.length > 1) {
      return pathParts.slice(1).join('/');
    }

    throw new Error('Invalid S3 URL format');
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    throw error;
  }
};


/**
 * Delete an object from S3
 * @param {string} fileName - The file name/key in S3 bucket or full S3 URL
 * @param {string} bucketName - Optional bucket name (defaults to AWS_BUCKET_NAME env variable)
 * @returns {Promise<void>}
 */
const deleteObject = async (fileName, bucketName = null) => {
  try {
    if (!fileName) {
      throw new Error('File name is required');
    }

    let key = fileName;

    // Check if input is a URL and extract key if so
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
      try {
        key = extractS3KeyFromUrl(fileName);
      } catch (e) {
        console.warn(`Could not extract key from URL ${fileName}, using as is.`);
      }
    }

    const params = {
      Bucket: bucketName || process.env.AWS_BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error(`Error deleting object ${fileName} from S3:`, error);
    throw error;
  }
};

module.exports = {
  getSignedUrl,
  getBulkSignedUrls,
  getUploadSignedUrl,
  getObjectAsBase64,
  downloadObjectAsBuffer,
  extractS3KeyFromUrl,
  deleteObject
}; 