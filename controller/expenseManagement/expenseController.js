const { Op } = require('sequelize');
const { Expense, Reservation, Hotel, State, City } = require('../../db/models');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { buildWhereClause } = require('../../helper/filter');
const { generateExpenseExcelReport } = require('../../utils/expenseExcelHelper');
const { getSignedUrl } = require('../../utils/s3Helper');
const { fetchAssignHotelId } = require('../common/helper');

let resourceName = 'Expense';

exports.findAndCountAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, orderBy = 'DESC', hotelName, bookingId } = req.query;
    const offset = (page - 1) * limit;

    const filterConfig = {
      expenseType: 'exact',
      expenseCategory: 'exact',
      hotelId: 'exact',
      bookingId: 'like',
      expenseDate: 'range',
      modeOfPayment: 'exact',
      amount: 'exact',
      remark: 'exact',
      employeeName: 'exact',
      salaryMonth: 'exact',
      personName: 'exact',
    };

    const where = buildWhereClause(req.query, filterConfig);

    const hotelFilter = {};
    if (hotelName) hotelFilter.name = { [Op.iLike]: `%${hotelName}%` };

    const { rows: expenses, count: totalRecords } = await Expense.findAndCountAll({
      where,
      include: [
        {
          model: Hotel,
          as: 'hotel',
          where: hotelFilter,
          required: false,
          include: [
            { model: City, as: 'city' },
            { model: State, as: 'state' },
          ],
        },
        {
          model: Reservation,
          as: 'booking',
          required: false,
        },
      ],
      order: [['createdAt', orderBy]],
      offset: Number(offset),
      limit: Number(limit),
    });

    return successResponse(res, `${resourceName} list`, { expenses, totalRecords });
  } catch (error) {
    return errorResponse(res, error);
  }
};

exports.getAllExpenses = async (req, res) => {
  try {
    const filterConfig = {
      expenseType: 'exact',
      expenseCategory: 'exact',
      hotelId: 'exact',
      bookingId: 'exact',
      expenseDate: 'range',
      modeOfPayment: 'exact',
      amount: 'exact',
      remark: 'exact',
      employeeName: 'exact',
      salaryMonth: 'exact',
      personName: 'exact',
    };
    const where = buildWhereClause(req.query, filterConfig);

    const expenses = await Expense.findAll({ where, order: [['createdAt', 'DESC']] });
    return successResponse(res, `${resourceName} list`, { expenses });
  } catch (error) {
    return errorResponse(res, error);
  }
};

exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id, {
      include: [
        {
          model: Hotel,
          as: 'hotel',
          include: [{ model: City, as: 'city' }, { model: State, as: 'state' }],
        },
        {
          model: Reservation,
          as: 'booking',
        },
      ],
    });

    if (!expense) return errorResponse(res, { message: `${resourceName} not found`, status: 404 });

    let expenseData = expense.toJSON();

    if (expenseData.receipt) {
      const receiptUrl = Array.isArray(expenseData.receipt) ? expenseData.receipt[0] : expenseData.receipt;
      const url = getSignedUrl(receiptUrl);
      expenseData.receiptS3Url = url;
    }

    return successResponse(res, `${resourceName} details`, expenseData);
  } catch (error) {
    return errorResponse(res, error);
  }
};

exports.createExpense = async (req, res) => {
  try {
    const payload = req.body;
    const expense = await Expense.create(payload);
    return successResponse(res, `${resourceName} created`, expense);
  } catch (error) {
    return errorResponse(res, error);
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const [rows] = await Expense.update(payload, { where: { id } });
    if (!rows) return errorResponse(res, { message: `${resourceName} not found`, status: 404 });
    const expense = await Expense.findByPk(id);
    return successResponse(res, `${resourceName} updated`, expense);
  } catch (error) {
    return errorResponse(res, error);
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await Expense.destroy({ where: { id } });
    if (!rows) return errorResponse(res, { message: `${resourceName} not found`, status: 404 });
    return successResponse(res, `${resourceName} deleted`, { id });
  } catch (error) {
    return errorResponse(res, error);
  }
};

exports.exportToExcel = async (req, res) => {
  try {
    const {
      hotelId, expenseType, expenseCategory, expenseDate, modeOfPayment,
      amount, remark, employeeName, salaryMonth, personName, bookingId
    } = req?.query;

    const queryParams = {
      hotelId,
      expenseType,
      expenseCategory,
      expenseDate,
      modeOfPayment,
      amount,
      remark,
      employeeName,
      salaryMonth,
      personName,
      bookingId
    };

    const filterConfig = {
      expenseType: 'exact',
      expenseCategory: 'exact',
      hotelId: 'exact',
      bookingId: 'like',
      expenseDate: 'range',
      modeOfPayment: 'exact',
      amount: 'exact',
      remark: 'exact',
      employeeName: 'exact',
      salaryMonth: 'exact',
      personName: 'exact',
    };

    const assignHotelId = fetchAssignHotelId(req?.user);

    if (assignHotelId) {
      if (hotelId) {
        if (!assignHotelId.includes(Number(hotelId))) {
          return errorResponse(res, `You are not authorized to access this hotel.`, [], 400);
        }
      } else {
        queryParams.hotelId = assignHotelId;
        filterConfig.hotelId = 'in';
      }
    }
    const where = buildWhereClause(queryParams, filterConfig);

    const hotelFilter = {};
    if (req.query.hotelName) hotelFilter.name = { [Op.iLike]: `%${req.query.hotelName}%` };

    const expenses = await Expense.findAll({
      where,
      include: [
        {
          model: Hotel,
          as: 'hotel',
          where: hotelFilter,
          required: false,
          include: [
            { model: City, as: 'city' },
            { model: State, as: 'state' },
          ],
        },
        {
          model: Reservation,
          as: 'booking',
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (!expenses || expenses.length === 0) {
      return errorResponse(res, "No expenses found for the specified criteria", null, 404);
    }

    // Generate Excel report using the helper function
    const workbook = await generateExpenseExcelReport(expenses);
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="expense_report.xlsx"`);

    // Write the workbook to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Expense export error:', error);
    return errorResponse(res, 'Error generating expense report', error.message);
  }
};



