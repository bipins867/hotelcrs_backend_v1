const express = require('express');
const router = express.Router();
const { upload, handleMulterError } = require('../middleware/upload');
const { uploadFile, getFile, getBulkFile } = require('../controller/uploadController');

router.post('/upload', upload.array('files'), handleMulterError, uploadFile);
router.post('/get-file', getFile);
router.post('/get-bulk-file', getBulkFile);

module.exports = router;
