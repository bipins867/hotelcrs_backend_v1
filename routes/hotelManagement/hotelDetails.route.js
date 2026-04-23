const express = require('express');
const router = express.Router();
const hotelDetailsController = require('../../controller/hotelManagement/hotelDetailsController.js');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, hotelDetailsController.getAll);
router.get('/pagination', verifyToken, hotelDetailsController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel:create'), hotelDetailsController.create);
router.get('/:id', verifyToken, hotelDetailsController.findById);
router.put('/:id', verifyToken, checkPermission('hotel:edit'), hotelDetailsController.update);
router.delete('/:id', verifyToken, checkPermission('hotel:delete'), hotelDetailsController.delete);

module.exports = router;
