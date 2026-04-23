const { Op } = require('sequelize');
const { BankStatement, Hotel, City, State, User, Reservation, Customer } = require('../../db/models');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { buildWhereClause } = require('../../helper/filter');
const { downloadObjectAsBuffer, extractS3KeyFromUrl } = require('../../utils/s3Helper');
const ExcelJS = require('exceljs');
const { generateBankStatementExcelReport } = require('../../utils/bankStatementExcelHelper');

let resourceName = 'Bank Statement';

// Get all bank statements with pagination
exports.findAndCountAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, orderBy = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const filterConfig = {
      bankName: 'like',
      accountNumber: 'like',
      status: 'like',
      startDate: 'range',
      endDate: 'range'
    };

    const where = buildWhereClause(req.query, filterConfig);

    const { rows: bankStatements, count: totalRecords } = await BankStatement.findAndCountAll({
      where,
      order: [['createdAt', orderBy]],
      offset: Number(offset),
      limit: Number(limit),
    });

    return successResponse(res, `${resourceName} list`, { bankStatements, totalRecords });
  } catch (error) {
    return errorResponse(res, error);
  }
};


// Get bank statement by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const bankStatement = await BankStatement.findByPk(id);

    if (!bankStatement) {
      return errorResponse(res, { message: `${resourceName} not found`, status: 404 });
    }

    return successResponse(res, `${resourceName} details`, bankStatement);
  } catch (error) {
    return errorResponse(res, error);
  }
};


// Upload and process bank statement
exports.uploadStatement = async (req, res) => {
  try {
    const {
      bankName,
      accountNumber,
      ifscCode,
      branchCountryId,
      branchStateId,
      branchCityId,
      mainCategory,
      hotelId,
      file,
    } = req.body;

    // Validate required fields
    if (!file) {
      return errorResponse(res, "File is required", null, 400);
    }

    if (!bankName || !accountNumber || !ifscCode || !branchCountryId || !branchStateId || !branchCityId) {
      return errorResponse(res, "Missing required fields", null, 400);
    }

    const createdBy = req.user ? req.user.id : null;
    const fileName = Array.isArray(file) ? file[0] : file;

    // Download file from S3 using fileName as key
    const fileBuffer = await downloadObjectAsBuffer(fileName);

    // Read Excel file using ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const worksheet = workbook.worksheets[0];

    // Convert worksheet to array of arrays
    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      row.eachCell((cell, colNumber) => {
        rowData[colNumber - 1] = cell.value;
      });
      data.push(rowData);
    });

    if (data.length < 2) {
      return errorResponse(res, "Invalid file format - no data found", null, 400);
    }

    // Get headers and data rows
    const headers = data[0];
    const dataRows = data.slice(1);

    // Process transactions based on bank type
    const transactions = processTransactionsByBankType(headers, dataRows, bankName);

    if (transactions.length === 0) {
      return errorResponse(res, "No valid transactions found in the file", null, 400);
    }

    // Create BankStatement records for each transaction with file data
    const savedTransactions = [];
    for (const transaction of transactions) {
      const bankStatementRecord = await BankStatement.create({
        bankName,
        accountNumber,
        ifscCode,
        branchCountryId,
        branchStateId,
        branchCityId,
        createdBy,
        ...transaction
      }, {
        userId: createdBy,
        req: req
      });

      savedTransactions.push(bankStatementRecord);
    }

    return successResponse(res, `${resourceName} processed successfully`, {
      message: `${savedTransactions.length} transactions saved successfully`,
      totalTransactions: savedTransactions.length,
      transactions: savedTransactions
    }, 201);
  } catch (error) {
    console.error('Error processing bank statement:', error);
    return errorResponse(res, `Error processing ${resourceName}`, error.message);
  }
};


// Process transactions based on bank type
function processTransactionsByBankType(headers, dataRows, bankName) {
  const transactions = [];

  // Get bank-specific template
  const bankTemplate = getBankTemplate(bankName);

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    // Initialize transaction object with only migration-defined fields
    const transaction = {
      // Required fields
      transactionDate: null,
      srNo: null,
      type: null,
      description: null,
      debit: null,
      credit: null,
      balance: null,
      valueDate: null,
      branch: null,
      refChqNo: null,
      withdraws: null,
      deposit: null,
      transactionId: null,
      txnPostedDate: null,
      chequeNo: null,
      crDr: null,
      transactionAmountInr: null,
      availableBalanceInr: null,
      narration: null,
      chqRefNo: null,
      withdrawalAmt: null,
      depositAmt: null,
      closingBalance: null,
      serial: null,
      amount: null,
      transactionType: null
    };

    // Map data based on bank template - serial wise mapping
    bankTemplate.columns.forEach((column, index) => {
      const value = row[index];
      if (value !== undefined && value !== null && value !== '') {
        switch (column.field) {
          case 'srNo':
            transaction.srNo = parseInt(value) || null;
            break;
          case 'serial':
            transaction.serial = parseInt(value) || null;
            break;
          case 'transactionDate':
            transaction.transactionDate = parseDate(value);
            break;
          case 'valueDate':
            transaction.valueDate = parseDate(value);
            break;
          case 'type':
            transaction.type = String(value).trim();
            break;
          case 'crDr':
            transaction.crDr = String(value).trim();
            break;
          case 'description':
            transaction.description = String(value).trim();
            break;
          case 'narration':
            transaction.narration = String(value).trim();
            break;
          case 'refChqNo':
            transaction.refChqNo = String(value).trim();
            break;
          case 'chqRefNo':
            transaction.chqRefNo = String(value).trim();
            break;
          case 'transactionId':
            transaction.transactionId = String(value).trim();
            break;
          case 'chequeNo':
            transaction.chequeNo = String(value).trim();
            break;
          case 'debit':
            transaction.debit = parseFloat(value) || null;
            if (transaction.debit > 0) {
              transaction.transactionType = 'debit';
            }
            break;
          case 'withdraws':
            transaction.withdraws = parseFloat(value) || null;
            break;
          case 'withdrawalAmt':
            transaction.withdrawalAmt = parseFloat(value) || null;
            break;
          case 'credit':
            transaction.credit = parseFloat(value) || null;
            if (transaction.credit > 0) {
              transaction.transactionType = 'credit';
            }
            break;
          case 'amount':
            transaction.amount = parseFloat(value) || null;
            break;
          case 'deposit':
            transaction.deposit = parseFloat(value) || null;
            break;
          case 'depositAmt':
            transaction.depositAmt = parseFloat(value) || null;
            break;
          case 'transactionAmountInr':
            transaction.transactionAmountInr = parseFloat(value) || null;
            break;
          case 'balance':
            transaction.balance = parseFloat(value) || null;
            break;
          case 'availableBalanceInr':
            transaction.availableBalanceInr = parseFloat(value) || null;
            break;
          case 'closingBalance':
            transaction.closingBalance = parseFloat(value) || null;
            break;
          case 'branch':
            transaction.branch = String(value).trim();
            break;
          case 'txnPostedDate':
            transaction.txnPostedDate = parseDate(value);
            break;
        }
      }
    });
    transactions.push(transaction);
  }

  return transactions;
}

// Get bank-specific template
function getBankTemplate(bankName) {
  const bankTemplates = {
    'Indusind Bank Ltd': {
      columns: [
        { header: 'Sr.No.', field: 'srNo' },
        { header: 'Date', field: 'transactionDate' },
        { header: 'Type', field: 'type' },
        { header: 'Description', field: 'description' },
        { header: 'Debit', field: 'debit' },
        { header: 'Credit', field: 'credit' },
        { header: 'Balance', field: 'balance' }
      ]
    },
    'Canara Bank Ltd': {
      columns: [
        { header: 'Trans Date', field: 'transactionDate' },
        { header: 'Value Date', field: 'valueDate' },
        { header: 'Branch', field: 'branch' },
        { header: 'REF/CHQ NO', field: 'refChqNo' },
        { header: 'Description', field: 'description' },
        { header: 'Withdraws', field: 'debit' },
        { header: 'Deposit', field: 'credit' },
        { header: 'Balance', field: 'balance' }
      ]
    },
    'ICICI Bank Ltd': {
      columns: [
        { header: 'No.', field: 'srNo' },
        { header: 'Transaction ID', field: 'refChqNo' },
        { header: 'Value Date', field: 'valueDate' },
        { header: 'Txn Posted Date', field: 'txnPostedDate' },
        { header: 'ChequeNo.', field: 'chequeNo' },
        { header: 'Description', field: 'description' },
        { header: 'Cr/Dr', field: 'type' },
        { header: 'Transaction Amount(INR)', field: 'amount' },
        { header: 'Available Balance(INR)', field: 'balance' }
      ]
    },
    'HDFC Bank Ltd': {
      columns: [
        { header: 'Date', field: 'transactionDate' },
        { header: 'Narration', field: 'narration' },
        { header: 'Chq./Ref.No.', field: 'refChqNo' },
        { header: 'Value Dt', field: 'valueDate' },
        { header: 'Withdrawal Amt.', field: 'debit' },
        { header: 'Deposit Amt.', field: 'credit' },
        { header: 'Closing Balance', field: 'balance' }
      ]
    },
    'Bank of Baroda Ltd': {
      columns: [
        { header: 'Serial', field: 'srNo' },
        { header: 'Transaction (Date)', field: 'transactionDate' },
        { header: 'Value (Date)', field: 'valueDate' },
        { header: 'Description', field: 'description' },
        { header: 'Cheuqe', field: 'chequeNo' },
        { header: 'Debit', field: 'debit' },
        { header: 'Credit', field: 'credit' },
        { header: 'Balance', field: 'balance' }
      ]
    },
    'Kotak Mahindra Bank Ltd': {
      columns: [
        { header: 'SL. No', field: 'srNo' },
        { header: 'Date', field: 'transactionDate' },
        { header: 'Description', field: 'description' },
        { header: 'Chq/Ref Number', field: 'refChqNo' },
        { header: 'Amount', field: 'amount' },
        { header: 'DR', field: 'debit' },
        { header: 'CR', field: 'credit' },
        { header: 'Balance', field: 'balance' }
      ]
    }
  };

  // Return template for the bank, or default template if not found
  return bankTemplates[bankName];
}

// Map headers to standard format based on bank type
function mapHeadersToStandardFormat(headers, bankName) {
  const headerMap = {};

  // Common mappings
  const commonMappings = {
    'Date': 'transactionDate',
    'Transaction Date': 'transactionDate',
    'Trans Date': 'transactionDate',
    'Value Date': 'valueDate',
    'Description': 'description',
    'Narration': 'narration',
    'Ref/Chq No': 'referenceNumber',
    'REF/CHQ NO': 'referenceNumber',
    'Chq./Ref.No.': 'referenceNumber',
    'Cheque': 'chequeNumber',
    'Cheuqe': 'chequeNumber',
    'Debit': 'debit',
    'Credit': 'credit',
    'Withdraws': 'debit',
    'Withdrawal Amt.': 'debit',
    'Deposit': 'credit',
    'Deposit Amt.': 'credit',
    'Amount': 'amount',
    'Transaction Amount(INR)': 'amount',
    'Balance': 'balance',
    'Closing Balance': 'balance',
    'Available Balance(INR)': 'balance',
    'Sr.No.': 'serial',
    'Serial': 'serial',
    'SL. No': 'serial',
    'No.': 'serial',
    'Type': 'type',
    'Branch': 'branch',
    'Txn Posted Date': 'txnPostedDate'
  };

  // Bank-specific mappings
  const bankSpecificMappings = {
    'ICICI Bank Ltd': {
      'No.': 'serial',
      'Transaction ID': 'referenceNumber',
      'Txn Posted Date': 'txnPostedDate',
      'ChequeNo.': 'chequeNumber',
      'Cr/Dr': 'type',
      'Available Balance(INR)': 'balance'
    },
    'HDFC Bank Ltd': {
      'Chq./Ref.No.': 'referenceNumber',
      'Value Dt': 'valueDate',
      'Withdrawal Amt.': 'debit',
      'Deposit Amt.': 'credit',
      'Closing Balance': 'balance'
    },
    'Canara Bank Ltd': {
      'REF/CHQ NO': 'referenceNumber',
      'Withdraws': 'debit',
      'Deposit': 'credit'
    },
    'Bank of Baroda Ltd': {
      'Serial': 'serial',
      'Transaction (Date)': 'transactionDate',
      'Value (Date)': 'valueDate',
      'Cheuqe': 'chequeNumber'
    },
    'Kotak Mahindra Bank Ltd': {
      'SL. No': 'serial',
      'Chq/Ref Number': 'referenceNumber',
      'DR': 'debit',
      'CR': 'credit'
    },
    'Indusind Bank Ltd': {
      'Sr.No.': 'serial',
      'Type': 'type'
    }
  };

  // Apply common mappings
  headers.forEach(header => {
    if (commonMappings[header]) {
      headerMap[header] = commonMappings[header];
    }
  });

  // Apply bank-specific mappings
  if (bankSpecificMappings[bankName]) {
    Object.entries(bankSpecificMappings[bankName]).forEach(([header, field]) => {
      if (headers.includes(header)) {
        headerMap[header] = field;
      }
    });
  }

  return headerMap;
}

// Parse date from various formats
function parseDate(dateValue) {
  if (!dateValue) return null;

  try {
    // Handle Excel date numbers
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Handle string dates
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

// Get bank statement transactions
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, orderBy = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const filterConfig = {
      transactionType: 'exact',
      mainCategory: 'exact',
      bankName: 'exact',
      accountNumber: 'exact',
      transactionDate: 'range',
      amount: 'range'
    };

    const where = buildWhereClause(req.query, filterConfig);

    const { rows: transactions, count: totalRecords } = await BankStatement.findAndCountAll({
      where,
      order: [['transactionDate', orderBy]],
      offset: Number(offset),
      limit: Number(limit),
    });

    return successResponse(res, 'Bank transactions list', { transactions, totalRecords });
  } catch (error) {
    return errorResponse(res, error);
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transactionType,
      mainCategory,
      category,
      hotelId,
      bookingId,
      amount,
      paymentCategory,
      salaryMonth,
      employeeName,
      modeOfPayment,
      comments,
      receipt
    } = req.body;

    const updatedBy = req.user ? req.user.id : null;

    const transaction = await BankStatement.findByPk(id);
    if (!transaction) {
      return errorResponse(res, 'Transaction not found', null, 404);
    }

    // Update fields
    transaction.transactionType = transactionType;
    transaction.mainCategory = mainCategory;
    transaction.category = category;
    transaction.hotelId = hotelId;
    transaction.bookingId = bookingId;
    transaction.amount = amount;
    transaction.paymentCategory = paymentCategory;
    transaction.salaryMonth = salaryMonth;
    transaction.employeeName = employeeName;
    transaction.modeOfPayment = modeOfPayment;
    transaction.comments = comments;
    transaction.paymentProof = receipt;
    transaction.updatedBy = updatedBy;

    await transaction.save({
      userId: updatedBy,
      req: req
    });

    return successResponse(res, 'Transaction updated successfully', transaction);
  } catch (error) {
    return errorResponse(res, 'Error updating transaction', error.message);
  }
};

// Update transaction category
exports.updateTransactionCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { mainCategory, comments, paymentCategory, modeOfPayment } = req.body;
    const updatedBy = req.user ? req.user.id : null;

    const transaction = await BankStatement.findByPk(id);
    if (!transaction) {
      return errorResponse(res, 'Transaction not found', null, 404);
    }

    transaction.mainCategory = mainCategory;
    transaction.comments = comments;
    transaction.paymentCategory = paymentCategory;
    transaction.modeOfPayment = modeOfPayment;
    transaction.updatedBy = updatedBy;

    await transaction.save({
      userId: updatedBy,
      req: req
    });

    return successResponse(res, 'Transaction category updated successfully', transaction);
  } catch (error) {
    return errorResponse(res, 'Error updating transaction category', error.message);
  }
};


// Download bank statement template
exports.downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Create worksheets for each bank with detailed templates
    const banks = [
      {
        name: 'Indusind Bank',
        headers: ['Sr.No.', 'Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance'],
        sampleData: [
          [1, '2024-01-01', 'CR', 'SALARY CREDIT', '', '50000.00', '50000.00'],
          [2, '2024-01-02', 'DR', 'ATM WITHDRAWAL', '2000.00', '', '48000.00'],
          [3, '2024-01-03', 'CR', 'TRANSFER CREDIT', '', '10000.00', '58000.00'],
          [4, '2024-01-04', 'DR', 'ONLINE TRANSFER', '5000.00', '', '53000.00'],
          [5, '2024-01-05', 'CR', 'INTEREST CREDIT', '', '150.00', '53150.00']
        ]
      },
      {
        name: 'Canara Bank',
        headers: ['Trans Date', 'Value Date', 'Branch', 'REF/CHQ NO', 'Description', 'Withdraws', 'Deposit', 'Balance'],
        sampleData: [
          ['2024-01-01', '2024-01-01', 'MAIN BRANCH', '123456', 'SALARY CREDIT', '', '50000.00', '50000.00'],
          ['2024-01-02', '2024-01-02', 'MAIN BRANCH', 'ATM001', 'ATM WITHDRAWAL', '2000.00', '', '48000.00'],
          ['2024-01-03', '2024-01-03', 'MAIN BRANCH', 'TRF001', 'TRANSFER CREDIT', '', '10000.00', '58000.00'],
          ['2024-01-04', '2024-01-04', 'MAIN BRANCH', 'CHQ001', 'CHEQUE PAYMENT', '5000.00', '', '53000.00'],
          ['2024-01-05', '2024-01-05', 'MAIN BRANCH', 'INT001', 'INTEREST CREDIT', '', '150.00', '53150.00']
        ]
      },
      {
        name: 'ICICI Bank',
        headers: ['No.', 'Transaction ID', 'Value Date', 'Txn Posted Date', 'ChequeNo.', 'Description', 'Cr/Dr', 'Transaction Amount(INR)', 'Available Balance(INR)'],
        sampleData: [
          [1, 'TXN123456', '2024-01-01', '2024-01-01', '', 'SALARY CREDIT', 'Cr', '50000.00', '50000.00'],
          [2, 'TXN123457', '2024-01-02', '2024-01-02', '', 'ATM WITHDRAWAL', 'Dr', '2000.00', '48000.00'],
          [3, 'TXN123458', '2024-01-03', '2024-01-03', '', 'TRANSFER CREDIT', 'Cr', '10000.00', '58000.00'],
          [4, 'TXN123459', '2024-01-04', '2024-01-04', 'CHQ001', 'CHEQUE PAYMENT', 'Dr', '5000.00', '53000.00'],
          [5, 'TXN123460', '2024-01-05', '2024-01-05', '', 'INTEREST CREDIT', 'Cr', '150.00', '53150.00']
        ]
      },
      {
        name: 'HDFC Bank',
        headers: ['Date', 'Narration', 'Chq./Ref.No.', 'Value Dt', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'],
        sampleData: [
          ['2024-01-01', 'SALARY CREDIT', 'SAL001', '2024-01-01', '', '50000.00', '50000.00'],
          ['2024-01-02', 'ATM WITHDRAWAL', 'ATM001', '2024-01-02', '2000.00', '', '48000.00'],
          ['2024-01-03', 'TRANSFER CREDIT', 'TRF001', '2024-01-03', '', '10000.00', '58000.00'],
          ['2024-01-04', 'CHEQUE PAYMENT', 'CHQ001', '2024-01-04', '5000.00', '', '53000.00'],
          ['2024-01-05', 'INTEREST CREDIT', 'INT001', '2024-01-05', '', '150.00', '53150.00']
        ]
      },
      {
        name: 'Bank of Baroda',
        headers: ['Serial', 'Transaction (Date)', 'Value (Date)', 'Description', 'Cheuqe', 'Debit', 'Credit', 'Balance'],
        sampleData: [
          [1, '2024-01-01', '2024-01-01', 'SALARY CREDIT', '', '', '50000.00', '50000.00'],
          [2, '2024-01-02', '2024-01-02', 'ATM WITHDRAWAL', '', '2000.00', '', '48000.00'],
          [3, '2024-01-03', '2024-01-03', 'TRANSFER CREDIT', '', '', '10000.00', '58000.00'],
          [4, '2024-01-04', '2024-01-04', 'CHEQUE PAYMENT', 'CHQ001', '5000.00', '', '53000.00'],
          [5, '2024-01-05', '2024-01-05', 'INTEREST CREDIT', '', '', '150.00', '53150.00']
        ]
      },
      {
        name: 'Kotak Mahindra',
        headers: ['SL. No', 'Date', 'Description', 'Chq/Ref Number', 'Amount', 'DR', 'CR', 'Balance'],
        sampleData: [
          [1, '2024-01-01', 'SALARY CREDIT', 'SAL001', '50000.00', '', '50000.00', '50000.00'],
          [2, '2024-01-02', 'ATM WITHDRAWAL', 'ATM001', '2000.00', '2000.00', '', '48000.00'],
          [3, '2024-01-03', 'TRANSFER CREDIT', 'TRF001', '10000.00', '', '10000.00', '58000.00'],
          [4, '2024-01-04', 'CHEQUE PAYMENT', 'CHQ001', '5000.00', '5000.00', '', '53000.00'],
          [5, '2024-01-05', 'INTEREST CREDIT', 'INT001', '150.00', '', '150.00', '53150.00']
        ]
      }
    ];

    banks.forEach(bank => {
      const worksheet = workbook.addWorksheet(bank.name);

      // Add headers
      worksheet.addRow(bank.headers);

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add sample data
      bank.sampleData.forEach(row => {
        worksheet.addRow(row);
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bank-statement-templates.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return errorResponse(res, 'Error generating template', error.message);
  }
};

// Export bank statements to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const filterConfig = {
      bankName: 'exact',
      accountNumber: 'exact',
      transactionType: 'exact',
      mainCategory: 'exact',
      category: 'exact',
      hotelId: 'exact',
      bookingId: 'exact',
      transactionDate: 'range',
      amount: 'range',
      modeOfPayment: 'exact',
      paymentCategory: 'exact'
    };
    const where = buildWhereClause(req.query, filterConfig);

    const hotelFilter = {};
    if (req.query.hotelName) hotelFilter.name = { [Op.iLike]: `%${req.query.hotelName}%` };

    // Single optimized query with all includes
    const bankStatements = await BankStatement.findAll({
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
          model: User,
          as: 'creator',
          required: false,
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    // Get all unique bookingIds and fetch reservations in one query
    const bookingIds = [...new Set(bankStatements
      .filter(stmt => stmt.bookingId)
      .map(stmt => stmt.bookingId)
    )];

    let reservationsMap = {};
    if (bookingIds.length > 0) {
      const reservations = await Reservation.findAll({
        where: { bookingId: { [Op.in]: bookingIds } },
        include: [
          {
            model: Customer,
            as: 'customers',
            required: false
          },
        ]
      });

      // Create a map for quick lookup
      reservationsMap = reservations.reduce((map, reservation) => {
        map[reservation.bookingId] = reservation;
        return map;
      }, {});
    }

    // Attach booking data to bank statements
    const statementsWithBookings = bankStatements.map(statement => ({
      ...statement?.toJSON ? statement.toJSON() : statement,
      booking: statement.bookingId ? reservationsMap[statement.bookingId] : null
    }));

    if (!statementsWithBookings || statementsWithBookings.length === 0) {
      return errorResponse(res, "No bank statements found for the specified criteria", null, 404);
    }

    // Generate Excel report using the helper function
    const workbook = await generateBankStatementExcelReport(statementsWithBookings, {
      fromDate: req.query.fromDate,
      toDate: req.query.toDate
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bank_statement_report.xlsx"`);

    // Write the workbook to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Bank statement export error:', error);
    return errorResponse(res, 'Error generating bank statement report', error.message);
  }
};
