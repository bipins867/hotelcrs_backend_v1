const express = require('express');
const router = express.Router();
const CityController = require('../../controller/siteManagement/cityController');
const { verifyToken } = require('../../utils/jwtHelper');
const { validateCityCreate, validateCityUpdate } = require('../../validator/siteManagement/cityValidator.js');
const { checkPermission } = require('../../middleware/authMiddleware');

// city Routes
router.get('/', verifyToken, CityController.getAll);
router.get('/with-stateCountry', verifyToken, CityController.getCityWithStateCountry);
router.get('/pagination', verifyToken, CityController.findAndCountAll);
router.post('/', verifyToken, checkPermission('city:create'), validateCityCreate, CityController.create);
router.get('/:id', verifyToken, CityController.findById);
router.put('/:id', verifyToken, checkPermission('city:edit'), validateCityUpdate, CityController.update);
router.delete('/:id', verifyToken, checkPermission('city:delete'), CityController.delete);

module.exports = router;
