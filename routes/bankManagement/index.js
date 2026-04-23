const express = require('express');
const router = express.Router();

const bankStatementRouter = require('./bankStatement.route');

// Mount sub-routes here
router.use('/bank-statements', bankStatementRouter);

module.exports = router;
