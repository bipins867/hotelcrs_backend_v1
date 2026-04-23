const express = require('express');
const router = express.Router();

const roleRouter = require('./role.route');

// Mount sub-routes here
router.use('/role', roleRouter);

module.exports = router;

