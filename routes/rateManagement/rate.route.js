const express = require('express');
const router = express.Router();
const RateController = require('../../controller/rateManagement/rateController.js');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, RateController.getAll);
router.get('/pagination', verifyToken, RateController.findAndCountAll);
router.post('/', verifyToken, checkPermission('rate:create'), RateController.create);
router.get('/:id', verifyToken, RateController.findById);
router.put('/:id', verifyToken, checkPermission('rate:edit'), RateController.update);
router.delete('/:id', verifyToken, checkPermission('rate:delete'), RateController.delete);

module.exports = router;
