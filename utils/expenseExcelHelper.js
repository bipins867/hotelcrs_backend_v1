const ExcelJS = require('exceljs');
const { CompanyDetails } = require('../db/models');

/**
 * Generate Excel report for expenses
 * @param {Array} expenses - Array of expense data
 * @param {Object} options - Report options
 * @returns {Promise<Buffer>} - Excel file buffer
 */
exports.generateExpenseExcelReport = async (expenses, options = {}) => {
  try {
    console.log('Starting Excel generation for', expenses.length, 'expenses');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Report');
    const companyDetails = await CompanyDetails.findOne();
    const companyName = companyDetails?.companyName || 'World Choice Hotels Private Limited';

    // Add download date in first row (centered across all columns)
    worksheet.getCell('A1').value = `${companyName} - Date of Download - ${new Date().toLocaleDateString('en-GB')}`;
    worksheet.getCell('A1').font = { bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:J1');

    // Add company name in second row (centered across all columns)
    worksheet.getCell('A2').value = `Company Name : ${companyName}`;
    worksheet.getCell('A2').font = { bold: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.mergeCells('A2:J2');

    // Add empty row for spacing
    worksheet.getRow(3).height = 10;

    // Set worksheet properties
    worksheet.properties.defaultRowHeight = 20;
    worksheet.properties.defaultColWidth = 15;

    // Define columns without headers (we'll add headers manually)
    worksheet.columns = [
      { key: 'serialNumber', width: 8 },
      { key: 'expenseType', width: 20 },
      { key: 'expenseDate', width: 20 },
      { key: 'amount', width: 15 },
      { key: 'bookingId', width: 15 },
      { key: 'hotelName', width: 30 },
      { key: 'modeOfPayment', width: 25 },
      { key: 'remark', width: 25 },
      { key: 'enteredBy', width: 15 },
      { key: 'postedDate', width: 15 }
    ];

    // Manually add headers to row 4 to ensure they appear
    const headerRow = worksheet.getRow(4);
    headerRow.getCell(1).value = 'SL. No';
    headerRow.getCell(2).value = 'Type of Expenses';
    headerRow.getCell(3).value = 'Date of Expenses';
    headerRow.getCell(4).value = 'Amount';
    headerRow.getCell(5).value = 'Booking ID';
    headerRow.getCell(6).value = 'Hotel Name & City (If Expenses By)';
    headerRow.getCell(7).value = 'Mode (Mode of Payment)';
    headerRow.getCell(8).value = 'Remarks';
    headerRow.getCell(9).value = 'Entered By';
    headerRow.getCell(10).value = 'Posted Date';

    // Style the header row (row 4) - this is where the column headers will be
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add borders to header row
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    expenses.forEach((expense, index) => {
      const hotelInfo = expense.hotel ?
        `${expense.hotel.name || ''}${expense.hotel.city ? `, ${expense.hotel.city.name || ''}` : ''}` :
        'N/A';

      const row = worksheet.addRow({
        serialNumber: index + 1,
        expenseType: expense.expenseType || 'N/A',
        expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : 'N/A',
        amount: Number(expense.amount) || 0,
        bookingId: expense.bookingId || 'N/A',
        hotelName: hotelInfo,
        modeOfPayment: `${expense.modeOfPayment || 'N/A'}`,
        remark: expense.remark || 'N/A',
        enteredBy: expense.personName || 'N/A',
        postedDate: expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'N/A'
      });

      // Add borders to data row
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Alternate row colors for better readability
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' }
        };
      }

      // Format currency column
      const amountCell = row.getCell('amount');
      if (amountCell.value && typeof amountCell.value === 'number' && amountCell.value > 0) {
        amountCell.numFmt = '#,##0.00';
      }
    });

    // Add filters to header row
    worksheet.autoFilter = {
      from: 'A4',
      to: `I${expenses.length + 4}`
    };

    console.log('Excel generation completed successfully');
    return workbook;
  } catch (error) {
    console.error('Error generating expense Excel report:', error);
    throw error;
  }
};