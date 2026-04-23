const express = require('express');
const router = express.Router();
const InquiryController = require('../../controller/inquiryManagement/inquiryController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// Inquiry Management Routes
router.get('/', verifyToken, InquiryController.getAll);
router.get('/pagination', verifyToken, InquiryController.findAndCountAll);
router.get('/:id', verifyToken, InquiryController.findById);
router.post('/', verifyToken, checkPermission('inquiry:create'), InquiryController.create);
router.put('/:id', verifyToken, checkPermission('inquiry:edit'), InquiryController.update);
router.delete('/:id', verifyToken, checkPermission('inquiry:delete'), InquiryController.delete);
router.post('/:id/resend-email', verifyToken, checkPermission('inquiry:resend_email'), InquiryController.resendEmail);
router.post('/:id/resend-whatsapp', verifyToken, checkPermission('inquiry:resend_whatsapp'), InquiryController.resendWhatsApp);
router.post('/:id/send-both', verifyToken, checkPermission('inquiry:send_both'), InquiryController.sendBoth);

module.exports = router;
