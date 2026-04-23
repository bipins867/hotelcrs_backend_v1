const express = require('express');
const router = express.Router();
const PaymentTypeController = require('../../controller/siteManagement/paymentTypeController');
const { verifyToken } = require('../../utils/jwtHelper');
const { validatePaymentTypeCreate, validatePaymentTypeUpdate } = require('../../validator/siteManagement/paymentTypeValidator');
const { checkPermission } = require('../../middleware/authMiddleware');

// payment type Routes
router.get('/', verifyToken, PaymentTypeController.getAll);
router.get('/pagination', verifyToken, PaymentTypeController.findAndCountAll);
router.post('/', verifyToken, checkPermission('payment_type:create'), validatePaymentTypeCreate, PaymentTypeController.create);
router.get('/:id', verifyToken, PaymentTypeController.findById);
router.put('/:id', verifyToken, checkPermission('payment_type:edit'), validatePaymentTypeUpdate, PaymentTypeController.update);
router.delete('/:id', verifyToken, checkPermission('payment_type:delete'), PaymentTypeController.delete);

module.exports = router;
