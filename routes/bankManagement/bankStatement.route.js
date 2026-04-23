const express = require('express');
const router = express.Router();
const bankStatementController = require('../../controller/bankManagement/bankStatementController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

// Bank Statement Routes
router.get('/pagination', verifyToken, bankStatementController.findAndCountAll);
router.get('/:id', verifyToken, bankStatementController.getById);

// Upload bank statement
router.post('/upload', verifyToken, checkPermission('bank:create'), bankStatementController.uploadStatement);

// Get transactions for a bank statement
router.get('/:id/transactions', verifyToken, bankStatementController.getTransactions);

// Update transaction
router.put('/transactions/:id', verifyToken, checkPermission('bank:edit'), bankStatementController.updateTransaction);

// Update transaction category
router.put('/transactions/:id/category', verifyToken, checkPermission('bank:edit'), bankStatementController.updateTransactionCategory);

// Download template
router.get('/download/template', verifyToken, bankStatementController.downloadTemplate);

// Export bank statements to Excel
router.get('/export/excel', verifyToken, checkPermission('bank:export'), bankStatementController.exportToExcel);

module.exports = router;
