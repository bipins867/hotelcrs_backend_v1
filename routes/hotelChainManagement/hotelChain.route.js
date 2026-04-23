const express = require('express');
const router = express.Router();
const hotelChainController = require('../../controller/hotelChainController/hotelChainController.js');
const { verifyToken } = require('../../utils/jwtHelper.js');

router.get('/', verifyToken, hotelChainController.getAll);
router.post('/', verifyToken, hotelChainController.create);
router.get('/:id', verifyToken, hotelChainController.findById);
router.put('/:id', verifyToken, hotelChainController.update);
router.delete('/:id', verifyToken, hotelChainController.delete);

module.exports = router;
