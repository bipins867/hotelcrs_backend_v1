const express = require('express');
const router = express.Router();
const PolicyController = require('../../controller/hotelManagement/policyController.js');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, PolicyController.getAll);
router.get('/pagination', verifyToken, PolicyController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel:create'), PolicyController.create);
router.get('/:id', verifyToken, PolicyController.findById);
router.put('/:id', verifyToken, checkPermission('hotel:edit'), PolicyController.update);
router.delete('/:id', verifyToken, checkPermission('hotel:delete'), PolicyController.delete);

module.exports = router;
