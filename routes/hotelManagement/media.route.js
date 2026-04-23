const express = require('express');
const router = express.Router();
const MediaController = require('../../controller/hotelManagement/mediaController.js');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, MediaController.getAll);
router.get('/pagination', verifyToken, MediaController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel:create'), MediaController.create);
router.get('/:id', verifyToken, MediaController.findById);
router.put('/:id', verifyToken, checkPermission('hotel:edit'), MediaController.update);
router.delete('/:id', verifyToken, checkPermission('hotel:delete'), MediaController.delete);

module.exports = router;
