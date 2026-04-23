const express = require('express');
const router = express.Router();
const controller = require('../../controller/gstManagement/gstInvoiceController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/gst-invoices/pagination', verifyToken, controller.findAndCountAll);
router.get('/gst-invoices/:id', verifyToken, controller.findById);
router.get('/gst-invoices-details/:bookingId', controller.findByReservationId);
router.post('/gst-invoices/regenerate/:bookingId', verifyToken, checkPermission('gst:regenerate'), controller.regenerate);
router.post('/gst-invoices', verifyToken, checkPermission('gst:create'), controller.create);
router.put('/gst-invoices/:id', verifyToken, checkPermission('gst:edit'), controller.update);
router.delete('/gst-invoices/:id', verifyToken, checkPermission('gst:delete'), controller.destroy);

module.exports = router;


