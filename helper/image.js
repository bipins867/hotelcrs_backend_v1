const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Define the folder to store uploaded files
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate a unique file name
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type, only images are allowed'), false);
  }
};

// Create the multer upload function for multiple files
const uploadImages = (fieldName) => {
  return multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // limit file size to 10MB
    fileFilter: fileFilter
  }).array(fieldName, 5); // 'fieldName' is the name of the input field, and 5 is the max number of files allowed
};

module.exports = { uploadImages };
