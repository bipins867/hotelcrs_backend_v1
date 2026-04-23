const express = require('express');
const router = express.Router();
const roomController = require('../../controller/roomManagement/roomController.js');
const { verifyToken } = require('../../utils/jwtHelper.js');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, roomController.getAll);
router.get('/pagination', verifyToken, roomController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel:create'), roomController.create);
router.put('/upsert', verifyToken, checkPermission('hotel:edit'), roomController.upsert);
router.get('/:id', verifyToken, roomController.findById);
router.put('/:id', verifyToken, checkPermission('hotel:edit'), roomController.update);
router.delete('/:id', verifyToken, checkPermission('hotel:delete'), roomController.delete);

module.exports = router;
