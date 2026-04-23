const express = require('express');
const router = express.Router();
const RatePlanController = require('../../controller/siteManagement/ratePlanController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// Rate Plan Routes
router.get('/', verifyToken, RatePlanController.getAll);
router.get('/pagination', verifyToken, RatePlanController.findAndCountAll);
router.post('/', verifyToken, checkPermission('rate_plan:create'), RatePlanController.create);
router.get('/:id', verifyToken, RatePlanController.findById);
router.put('/:id', verifyToken, checkPermission('rate_plan:edit'), RatePlanController.update);
router.delete('/:id', verifyToken, checkPermission('rate_plan:delete'), RatePlanController.delete);

module.exports = router;
