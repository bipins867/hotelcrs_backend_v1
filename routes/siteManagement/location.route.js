const express = require('express');
const router = express.Router();
const LocationController = require('../../controller/siteManagement/locationController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, LocationController.getAll);
router.get('/pagination', verifyToken, LocationController.findAndCountAll);
router.post('/', verifyToken, checkPermission('location:create'), LocationController.create);
router.get('/:id', verifyToken, LocationController.findById);
router.put('/:id', verifyToken, checkPermission('location:edit'), LocationController.update);
router.delete('/:id', verifyToken, checkPermission('location:delete'), LocationController.delete);

module.exports = router;
