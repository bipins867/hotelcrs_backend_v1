const express = require('express');
const router = express.Router();
const documentController = require('../../controller/documentManagement/documentController.js');
const { verifyToken } = require('../../utils/jwtHelper.js');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, documentController.getAll);
router.get('/pagination', verifyToken, documentController.findAndCountAll);
router.post('/', verifyToken, checkPermission('document:create'), documentController.create);
router.get('/:id', verifyToken, documentController.findById);
router.put('/:id', verifyToken, checkPermission('document:edit'), documentController.update);
router.delete('/:id', verifyToken, checkPermission('document:delete'), documentController.delete);
// signed url routes
router.get('/:id/view-url', verifyToken, documentController.getViewSignedUrl);
router.get('/:id/download-url', verifyToken, documentController.getDownloadSignedUrl);

module.exports = router;
