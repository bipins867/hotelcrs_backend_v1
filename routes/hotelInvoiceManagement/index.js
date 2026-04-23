const express = require('express');
const router = express.Router();
const hotelInvoiceController = require('../../controller/hotelInvoiceManagement/hotelInvoiceController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/missing', verifyToken, hotelInvoiceController.getMissingInvoices);
router.post('/remind', verifyToken, hotelInvoiceController.sendReminder);
router.get('/export', verifyToken, hotelInvoiceController.exportInvoices);
router.get('/:id', verifyToken, hotelInvoiceController.getInvoiceDetails);
router.post('/upload', verifyToken, checkPermission('hotel_invoices:create'), hotelInvoiceController.uploadInvoice);
router.get('/', verifyToken, hotelInvoiceController.getInvoices);
router.put('/:id/status', verifyToken, checkPermission('hotel_invoices:edit'), hotelInvoiceController.updateStatus);
router.put('/:id', verifyToken, checkPermission('hotel_invoices:edit'), hotelInvoiceController.updateInvoice);

module.exports = router;
