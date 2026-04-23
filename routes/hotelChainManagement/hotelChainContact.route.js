const express = require('express');
const router = express.Router();
const hotelChainContactController = require('../../controller/hotelChainController/hotelChainContactController.js');
const { verifyToken } = require('../../utils/jwtHelper.js');

router.get('/', verifyToken, hotelChainContactController.getAll);
router.post('/', verifyToken, hotelChainContactController.create);
router.get('/:id', verifyToken, hotelChainContactController.findById);
router.put('/:id', verifyToken, hotelChainContactController.update);
router.delete('/:id', verifyToken, hotelChainContactController.delete);

module.exports = router;
