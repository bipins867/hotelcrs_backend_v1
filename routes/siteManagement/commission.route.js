const express = require('express');
const router = express.Router();
const CommissionController = require('../../controller/siteManagement/commissionController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// commission Routes
router.get('/', verifyToken, CommissionController.getAll);
router.get('/pagination', verifyToken, CommissionController.findAndCountAll);
router.post('/', verifyToken, checkPermission('commission:create'), CommissionController.create);
router.get('/:id', verifyToken, CommissionController.findById);
router.put('/:id', verifyToken, checkPermission('commission:edit'), CommissionController.update);
router.delete('/:id', verifyToken, checkPermission('commission:delete'), CommissionController.delete);

module.exports = router;
