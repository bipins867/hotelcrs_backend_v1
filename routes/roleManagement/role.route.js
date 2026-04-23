const express = require('express');
const router = express.Router();
const RoleController = require('../../controller/roleManagement/roleController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/',
  verifyToken,
  RoleController.getAll
);

router.get('/permissions',
  verifyToken,
  RoleController.getAllPermissions
);

router.post('/',
  verifyToken,
  checkPermission('role:create'),
  RoleController.create
);

router.get('/:id',
  verifyToken,
  RoleController.findById
);

router.put('/:id',
  verifyToken,
  checkPermission('role:edit'),
  RoleController.update
);

router.delete('/:id',
  verifyToken,
  checkPermission('role:delete'),
  RoleController.delete
);

module.exports = router;

