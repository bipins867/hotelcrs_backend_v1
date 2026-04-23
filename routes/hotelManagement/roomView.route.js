const express = require('express');
const router = express.Router();
const { getAll, create, getById, update, deleteRoomView } = require('../../controller/hotelManagement/roomViewController.js');
const { verifyToken } = require('../../utils/jwtHelper.js');

// city Routes
router.get('/', verifyToken, getAll);
router.post('/', verifyToken, create);
router.get('/:id', verifyToken, getById);
router.put('/:id', verifyToken, update);
router.delete('/:id', verifyToken, deleteRoomView);

module.exports = router;
