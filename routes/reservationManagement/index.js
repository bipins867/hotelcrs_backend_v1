const express = require('express');
const router = express.Router();

const reservationRouter = require('./reservation.route.js');

// Mount sub-routes here
router.use('/reservation', reservationRouter);

module.exports = router;