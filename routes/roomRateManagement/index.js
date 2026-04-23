const express = require('express');
const router = express.Router();
const roomRateController = require('../../controller/roomRateManagement/roomRateController.js');
const { verifyToken } = require('../../utils/jwtHelper.js');
const { checkPermission } = require('../../middleware/authMiddleware.js');

router.post('/', verifyToken, checkPermission('rate:create'), roomRateController.create);
router.get('/:id', verifyToken, roomRateController.findById);
router.put('/:id', verifyToken, checkPermission('rate:edit'), roomRateController.update);
router.delete('/:id', verifyToken, checkPermission('rate:delete'), roomRateController.delete);
router.get('/', verifyToken, roomRateController.getAll);
router.post('/inventory', verifyToken, checkPermission('rate:edit'), roomRateController.createInventory);
router.post('/update-rates', verifyToken, checkPermission('rate:edit'), roomRateController.updateRates);
router.post('/restrictions', verifyToken, checkPermission('rate:edit'), roomRateController.updateRestrictions);

module.exports = router;
