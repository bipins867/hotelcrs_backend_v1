const express = require('express');
const inclusionController = require('../controller/inclusionController');
const { verifyToken } = require('../utils/jwtHelper');
const router = express.Router();
const { checkPermission } = require('../middleware/authMiddleware');

router.post('/', verifyToken, checkPermission('inclusion:create'), inclusionController.create);
router.get('/pagination', inclusionController.findAndCountAll);
router.get('/', verifyToken, inclusionController.getAll);
router.get('/:id', verifyToken, inclusionController.findById);
router.put('/:id', verifyToken, checkPermission('inclusion:edit'), inclusionController.update);
router.delete('/:id', verifyToken, checkPermission('inclusion:delete'), inclusionController.delete);

module.exports = router;
