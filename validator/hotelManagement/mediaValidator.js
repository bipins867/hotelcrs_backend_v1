const { errorResponse } = require('../../utils/responseHelper');

// Function to validate YouTube URLs
const validateYouTubeUrls = (youtubeUrls) => {
  if (!youtubeUrls) return true;
  
  const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]+(\?.*)?$/;
  
  // If it's a string (textarea input), split by newlines
  if (typeof youtubeUrls === 'string') {
    const urls = youtubeUrls.split('\n').filter(url => url.trim());
    return urls.every(url => urlPattern.test(url.trim()));
  }
  
  // If it's an array
  if (Array.isArray(youtubeUrls)) {
    return youtubeUrls.every(url => urlPattern.test(url));
  }
  
  return false;
};

module.exports = {
    validateMediaCreate: async (req, res, next) => {
        const { hotelId, youtubeUrls } = req.body;

        const errors = {};

        if (!hotelId) {
            errors.hotelId = 'hotel Id is required';
        }

        if (youtubeUrls && !validateYouTubeUrls(youtubeUrls)) {
            errors.youtubeUrls = 'Please enter valid YouTube URLs';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validateMediaUpdate: async (req, res, next) => {
        const { hotelId, youtubeUrls } = req.body;
        
        const errors = {};

        if (!hotelId) {
            errors.hotelId = 'hotel Id is required';
        }

        if (youtubeUrls && !validateYouTubeUrls(youtubeUrls)) {
            errors.youtubeUrls = 'Please enter valid YouTube URLs';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },
};
