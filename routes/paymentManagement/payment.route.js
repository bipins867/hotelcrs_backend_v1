const express = require('express');
const router = express.Router();
const paymentController = require('../../controller/paymentManagement/paymentController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/pagination', verifyToken, paymentController.findAndCountAll);
router.get('/', verifyToken, paymentController.getAllPayments);
router.get('/:id', verifyToken, paymentController.getPaymentById);
router.post('/', verifyToken, checkPermission('payment:create'), paymentController.createPayment);
router.put('/:id', verifyToken, checkPermission('payment:edit'), paymentController.updatePayment);
router.delete('/:id', verifyToken, checkPermission('payment:delete'), paymentController.deletePayment);
router.post('/send-invoice/:id', verifyToken, checkPermission('payment:send_email'), paymentController.sendPaymentInvoice);
router.post('/send-receipt/:id', verifyToken, checkPermission('payment:receipt'), paymentController.sendPaymentReceipt);
router.put('/:id/cancel', verifyToken, checkPermission('payment:edit'), paymentController.cancelPayment);

module.exports = router;
