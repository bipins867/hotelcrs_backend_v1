const express = require('express');
const router = express.Router();

const rateRouter = require('./rate.route.js');

// Mount sub-routes here
router.use('/rate', rateRouter);

module.exports = router;