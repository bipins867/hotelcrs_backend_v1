const express = require('express');
const router = express.Router();
const expenseController = require('../../controller/expenseManagement/expenseController');
const { verifyToken } = require('../../utils/jwtHelper');
const { checkPermission } = require('../../middleware/authMiddleware');

router.get('/pagination', verifyToken, expenseController.findAndCountAll);
router.get('/export/excel', verifyToken, expenseController.exportToExcel);
router.get('/', verifyToken, expenseController.getAllExpenses);
router.get('/:id', verifyToken, expenseController.getExpenseById);
router.post('/', verifyToken, checkPermission('expense:create'), expenseController.createExpense);
router.put('/:id', verifyToken, checkPermission('expense:edit'), expenseController.updateExpense);
router.delete('/:id', verifyToken, checkPermission('expense:delete'), expenseController.deleteExpense);

module.exports = router;


