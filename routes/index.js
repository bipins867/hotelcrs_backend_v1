const express = require('express');
const router = express.Router();

// Import sub-routes
const authRouter = require('../routes/auth/auth.route');
const ratePlanRouter = require('./siteManagement/index.js');
const uploadRouter = require('./upload.js');
const siteManagementRouter = require('./siteManagement/index.js');
const hotelManagementRouter = require('./hotelManagement/index.js');
const roomManagementRouter = require('./roomManagement/index.js');
const documentManagementRouter = require('./documentManagement/index.js');
const hotelChainManagementRouter = require('./hotelChainManagement/index.js');
const rateManagementRouter = require('./rateManagement/index.js');
const inclusionRoute = require('./inclusionRoute.js');
const roomRateRouter = require('./roomRateManagement/index.js');
const reservationRouter = require('./reservationManagement/index.js');
const paymentRouter = require('./paymentManagement/payment.route');
const expenseRouter = require('./expenseManagement/expense.route');
const bankManagementRouter = require('./bankManagement/index.js');
const userRouter = require('./users.js');
const otaManagementRouter = require('./otaManagement/index.js');
const gstManagementRouter = require('./gstManagement/index.js');
const inquiryManagementRouter = require('./inquiryManagement/index.js');
const roleManagementRouter = require('./roleManagement/index.js');
const hotelInvoiceManagementRouter = require('./hotelInvoiceManagement/index.js');

// Base route for the API (Welcome message)
router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the v1 API!' });
});

// Mount sub-routes here
router.use('/auth', authRouter);
router.use('/site-management', ratePlanRouter);
router.use('/', uploadRouter);
router.use('/site-management', siteManagementRouter);
router.use('/hotel-management', hotelManagementRouter);
router.use('/room-management', roomManagementRouter);
router.use('/document-management', documentManagementRouter);
router.use('/hotelchain-management', hotelChainManagementRouter);
router.use('/rate-management', rateManagementRouter);
router.use('/inclusion', inclusionRoute);
router.use('/room-rate', roomRateRouter);
router.use('/reservation-management', reservationRouter);
router.use('/payment-management', paymentRouter);
router.use('/expense-management', expenseRouter);
router.use('/bank-management', bankManagementRouter);
router.use('/users', userRouter);
router.use('/ota-management', otaManagementRouter);
router.use('/gst-management', gstManagementRouter);
router.use('/inquiry-management', inquiryManagementRouter);
router.use('/role-management', roleManagementRouter);
router.use('/hotel-invoice-management', hotelInvoiceManagementRouter);

module.exports = router;

