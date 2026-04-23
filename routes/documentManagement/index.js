const express = require('express');
const router = express.Router();

const documentRouter = require('./document.route');

router.use('/document', documentRouter);

module.exports = router;