const express = require('express');
const router = express.Router();
const restaurantDetailsController = require('../../controller/hotelManagement/restaurantDetailsController.js');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// Restaurant Details Routes
router.get('/', verifyToken, restaurantDetailsController.getAll);
router.get('/pagination', verifyToken, restaurantDetailsController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel:create'), restaurantDetailsController.create);
router.get('/hotel/:hotelId', verifyToken, restaurantDetailsController.findByHotelId);
router.get('/:id', verifyToken, restaurantDetailsController.findById);
router.put('/:id', verifyToken, checkPermission('hotel:edit'), restaurantDetailsController.update);
router.delete('/:id', verifyToken, checkPermission('hotel:delete'), restaurantDetailsController.delete);

module.exports = router;
