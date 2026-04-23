const express = require('express');
const router = express.Router();
const UserController = require('../controller/auth/userManagement/userController');
const { verifyToken } = require('../utils/jwtHelper');

router.get('/',
  verifyToken,
  UserController.getAll
);

router.get('/pagination',
  verifyToken,
  UserController.findAndCountAll
);

router.post('/',
  verifyToken,
  UserController.create
);

router.get('/:id',
  verifyToken,
  UserController.findById
);

router.put('/:id',
  verifyToken,
  UserController.update
);

router.delete('/:id',
  verifyToken,
  UserController.delete
);

module.exports = router; 