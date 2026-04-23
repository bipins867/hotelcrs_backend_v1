const express = require('express');
const router = express.Router();

const ratePlanRouter = require('./ratePlan.route');
const countryRouter = require('./country.route');
const stateRouter = require('./state.route');
const cityRouter = require('./city.route');
const locationRouter = require('./location.route');
const paymentTypeRouter = require('./paymentType.route');
const customerRouter = require('./cutomer.route');
const commissionRouter = require('./commission.route');
const travelPartnerRouter = require('./travelPartners.route');
const companyDetailsRouter = require('./companyDetails.route');

// Mount sub-routes here
router.use('/rate-plan', ratePlanRouter);
router.use('/country', countryRouter);
router.use('/state', stateRouter);
router.use('/city', cityRouter);
router.use('/location', locationRouter);
router.use('/payment-type', paymentTypeRouter);
router.use('/customer', customerRouter);
router.use('/commission', commissionRouter);
router.use('/travel-partners', travelPartnerRouter);
router.use('/company-details', companyDetailsRouter);

module.exports = router;