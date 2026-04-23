const express = require('express');
const router = express.Router();

const hotelChainRoute = require('./hotelChain.route');
const hotelChainContactRoute = require('./hotelChainContact.route');

router.use('/hotel-chain', hotelChainRoute);
router.use('/hotel-chain-contact', hotelChainContactRoute);

module.exports = router;