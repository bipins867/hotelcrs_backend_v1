const express = require('express');
const router = express.Router();
const HotelController = require('../../controller/hotelManagement/hotelController.js');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes (Comment says city, but it's hotel)
router.get('/', verifyToken, HotelController.getAll);
router.get('/pagination', verifyToken, HotelController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel:create'), HotelController.create);
router.get('/:id', verifyToken, HotelController.findById);
router.put('/:id', verifyToken, checkPermission('hotel:edit'), HotelController.update);
router.delete('/:id', verifyToken, checkPermission('hotel:delete'), HotelController.delete);

module.exports = router;
