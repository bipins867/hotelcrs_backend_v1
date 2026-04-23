const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Set your AWS access key
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Set your AWS secret key
  region: process.env.AWS_REGION || 'eu-north-1', // Set AWS region
  httpOptions: {
    timeout: 300000, // 5 minutes timeout
    connectTimeout: 60000 // 1 minute connection timeout
  },
  maxRetries: 3, // Retry up to 3 times
  retryDelayOptions: {
    customBackoff: function(retryCount) {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, retryCount), 10000);
    }
  }
});

module.exports = s3;
