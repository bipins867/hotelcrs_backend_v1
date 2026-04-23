const express = require('express');
const router = express.Router();

// Import OTA Management routes
const otaListingRoutes = require('./otaListing.route');

// Use OTA Management routes
router.use('/ota-listings', otaListingRoutes);

module.exports = router;
