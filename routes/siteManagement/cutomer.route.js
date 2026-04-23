const express = require('express');
const router = express.Router();
const CustomerController = require('../../controller/siteManagement/customerController');
const { verifyToken } = require('../../utils/jwtHelper');
const { validateCustomerCreate, validateCustomerUpdate } = require('../../validator/siteManagement/customerValidator');
const { checkPermission } = require('../../middleware/authMiddleware');

// customer Routes
router.get('/', verifyToken, CustomerController.getAll);
router.get('/pagination', verifyToken, CustomerController.findAndCountAll);
router.post('/', verifyToken, checkPermission('customer:create'), validateCustomerCreate, CustomerController.create);
router.get('/:id', verifyToken, CustomerController.findById);
router.put('/:id', verifyToken, checkPermission('customer:edit'), validateCustomerUpdate, CustomerController.update);
router.delete('/:id', verifyToken, checkPermission('customer:delete'), CustomerController.delete);

module.exports = router;
