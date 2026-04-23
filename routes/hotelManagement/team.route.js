const express = require('express');
const router = express.Router();
const TeamController = require('../../controller/hotelManagement/teamController.js');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, TeamController.getAll);
router.get('/pagination', verifyToken, TeamController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel_users:create'), TeamController.create);
router.get('/:id', verifyToken, TeamController.findById);
router.put('/:id', verifyToken, checkPermission('hotel_users:edit'), TeamController.update);
router.delete('/:id', verifyToken, checkPermission('hotel_users:delete'), TeamController.delete);

module.exports = router;
