const express = require('express');
const router = express.Router();
const OtaListingController = require('../../controller/otaManagement/otaListingController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// Get all OTA listings (deprecated)
router.get('/',
  verifyToken,
  OtaListingController.getAll
);

// Get OTA listings with pagination and filter
router.get('/pagination',
  verifyToken,
  OtaListingController.findAndCountAll
);

// Export OTA listings to Excel
router.get('/export/excel',
  verifyToken,
  OtaListingController.exportToExcel
);

// Create new OTA listing
router.post('/',
  verifyToken,
  checkPermission('ota:create'),
  OtaListingController.create
);

// Get OTA listing by ID (deprecated)
router.get('/:id',
  verifyToken,
  OtaListingController.findById
);

// Update OTA listing (deprecated)
router.put('/:id',
  verifyToken,
  checkPermission('ota:edit'),
  OtaListingController.update
);

// Delete OTA listing (deprecated)
router.delete('/:id',
  verifyToken,
  checkPermission('ota:delete'),
  OtaListingController.delete
);

// Download OTA listing file
router.get('/:id/download',
  verifyToken,
  OtaListingController.downloadFile
);

module.exports = router;
