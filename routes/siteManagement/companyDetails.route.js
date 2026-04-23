const express = require('express');
const router = express.Router();
const companyDetailsController = require('../../controller/siteManagement/companyDetailsController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// Company Details routes
router.get('/', verifyToken, companyDetailsController.findCompanyDetails);
router.post('/', verifyToken, checkPermission('company_details:create'), companyDetailsController.create);

module.exports = router; 