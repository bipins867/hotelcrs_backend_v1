const express = require('express');
const router = express.Router();
const FinancialInformationController = require('../../controller/hotelManagement/financialInformationController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, FinancialInformationController.getAll);
router.get('/pagination', verifyToken, FinancialInformationController.findAndCountAll);
router.post('/', verifyToken, checkPermission('hotel:create'), FinancialInformationController.create);
router.get('/:id', verifyToken, FinancialInformationController.findById);
router.put('/:id', verifyToken, checkPermission('hotel:edit'), FinancialInformationController.update);
router.delete('/:id', verifyToken, checkPermission('hotel:delete'), FinancialInformationController.delete);

module.exports = router;
