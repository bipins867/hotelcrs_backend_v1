const express = require('express');
const router = express.Router();

const inquiryRouter = require('./inquiry.route');

// Mount sub-routes here
router.use('/', inquiryRouter);

module.exports = router;
