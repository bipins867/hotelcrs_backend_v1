const express = require('express');
const router = express.Router();
const CountryController = require('../../controller/siteManagement/countryController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// coutry Routes
router.get('/', verifyToken, CountryController.getAll);
router.get('/with-state', verifyToken, CountryController.getWithState);
router.get('/pagination', verifyToken, CountryController.findAndCountAll);
router.post('/', verifyToken, checkPermission('country:create'), CountryController.create);
router.get('/:id', verifyToken, CountryController.findById);
router.put('/:id', verifyToken, checkPermission('country:edit'), CountryController.update);
router.delete('/:id', verifyToken, checkPermission('country:delete'), CountryController.delete);

module.exports = router;
