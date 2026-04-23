const express = require('express');
const router = express.Router();

const hotelRouter = require('./hotel.route');
const FinancialInformationRouter = require('./financialInformation.route');
const policyRouter = require('./policy.route.js');
const teamRouter = require('./team.route.js');
const mediaRouter = require('./media.route.js');
const hotelDetailsRouter = require('./hotelDetails.route.js');
const restaurantDetailsRouter = require('./restaurantDetails.route.js');
const roomTypeRouter = require('./roomType.route.js');
const roomViewRouter = require('./roomView.route.js');
const bedTypeRouter = require('./bedType.route.js');

// Mount sub-routes here
router.use('/hotel', hotelRouter);
router.use('/financial-information', FinancialInformationRouter);
router.use('/policy', policyRouter);
router.use('/team', teamRouter);
router.use('/media', mediaRouter);
router.use('/hotel-details', hotelDetailsRouter);
router.use('/restaurant-details', restaurantDetailsRouter);
router.use('/room-type', roomTypeRouter);
router.use('/room-view', roomViewRouter);
router.use('/bed-type', bedTypeRouter);

module.exports = router;