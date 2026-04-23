const express = require('express');
const router = express.Router();
const TravelPartnersController = require('../../controller/siteManagement/travelPartnersController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// travel partner Routes
router.get('/', verifyToken, TravelPartnersController.getAll);
router.get('/pagination', verifyToken, TravelPartnersController.findAndCountAll);
router.post('/', verifyToken, checkPermission('travel_partners:create'), TravelPartnersController.create);
router.get('/:id', verifyToken, TravelPartnersController.findById);
router.put('/:id', verifyToken, checkPermission('travel_partners:edit'), TravelPartnersController.update);
router.delete('/:id', verifyToken, checkPermission('travel_partners:delete'), TravelPartnersController.delete);

module.exports = router;
