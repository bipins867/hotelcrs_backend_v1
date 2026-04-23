const express = require('express');
const router = express.Router();
const reservationController = require('../../controller/reservationManagement/reservationController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, reservationController.getAll);
router.get('/pagination', verifyToken, reservationController.findAndCountAll);
router.get('/download-report', verifyToken, reservationController.downloadReservationReport);
router.post('/', verifyToken, checkPermission('reservation:create'), reservationController.createReservation);
router.get('/:id', reservationController.findById);
router.get('/booking/:bookingId', reservationController.findByBookingId);
router.post('/:id/send-invoice', verifyToken, checkPermission('reservation:send_invoice'), reservationController.sendReservationInvoice);
router.put('/:id', verifyToken, checkPermission('reservation:edit'), reservationController.update);
router.delete('/:id', verifyToken, checkPermission('reservation:delete'), reservationController.delete);
router.put('/:id/confirm', verifyToken, checkPermission('reservation:edit'), reservationController.confirmReservation);
router.post('/:id/send-emails', verifyToken, checkPermission('reservation:send_email'), reservationController.sendReservationEmails);

module.exports = router;
