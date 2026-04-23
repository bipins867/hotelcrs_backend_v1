const express = require('express');
const router = express.Router();
const StateController = require('../../controller/siteManagement/stateController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// state Routes
router.get('/', verifyToken, StateController.getAll);
router.get('/with-country', verifyToken, StateController.getStateWithCountry);
router.get('/pagination', verifyToken, StateController.findAndCountAll);
router.post('/', verifyToken, checkPermission('state:create'), StateController.create);
router.get('/:id', verifyToken, StateController.findById);
router.put('/:id', verifyToken, checkPermission('state:edit'), StateController.update);
router.delete('/:id', verifyToken, checkPermission('state:delete'), StateController.delete);

module.exports = router;
