const express = require('express');
const router = express.Router();
const { getAll, create, getById, update, deleteRoomType } = require('../../controller/hotelManagement/roomTypeController.js');
const { verifyToken } = require('../../utils/jwtHelper.js');

// city Routes
router.get('/', verifyToken, getAll);
router.post('/', verifyToken, create);
router.get('/:id', verifyToken, getById);
router.put('/:id', verifyToken, update);
router.delete('/:id', verifyToken, deleteRoomType);

module.exports = router;
