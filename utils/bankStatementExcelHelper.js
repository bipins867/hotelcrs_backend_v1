const ExcelJS = require('exceljs');
const { CompanyDetails } = require('../db/models');

/**
 * Generate Excel report for bank statements
 * @param {Array} bankStatements - Array of bank statement data
 * @param {Object} options - Report options
 * @returns {Promise<Buffer>} - Excel file buffer
 */
exports.generateBankStatementExcelReport = async (bankStatements, options = {}) => {
  try {
    console.log('Starting Excel generation for', bankStatements.length, 'bank statements');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bank Statement Download');
    const companyDetails = await CompanyDetails.findOne();
    const companyName = companyDetails?.companyName || 'World Choice Hotels Private Limited';

    // Add download date in first row (centered across all columns)
    worksheet.getCell('A1').value = `Bank Statement Download | Date of Download : ${new Date().toLocaleDateString('en-GB')}`;
    worksheet.getCell('A1').font = { bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:Q1');

    // Add statement period in second row
    const fromDate = options.fromDate ? new Date(options.fromDate).toLocaleDateString('en-GB') : '';
    const toDate = options.toDate ? new Date(options.toDate).toLocaleDateString('en-GB') : '';
    worksheet.getCell('A2').value = `Statement from ${fromDate} to ${toDate}`;
    worksheet.getCell('A2').font = { bold: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.mergeCells('A2:Q2');

    // Add download source in third row
    worksheet.getCell('A3').value = `Downloaded from ${companyName}`;
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };
    worksheet.mergeCells('A3:Q3');

    // Add empty row for spacing
    worksheet.getRow(4).height = 10;

    // Set worksheet properties
    worksheet.properties.defaultRowHeight = 20;
    worksheet.properties.defaultColWidth = 15;

    // Define columns for bank statement export
    worksheet.columns = [
      { key: 'slNo', width: 8 },
      { key: 'companyName', width: 20 },
      { key: 'bankName', width: 20 },
      { key: 'accountNumber', width: 15 },
      { key: 'transactionDate', width: 15 },
      { key: 'valueDate', width: 15 },
      { key: 'amount', width: 15 },
      { key: 'bankNarration', width: 30 },
      { key: 'debit', width: 15 },
      { key: 'credit', width: 15 },
      { key: 'category', width: 20 },
      { key: 'narration', width: 30 },
      { key: 'postedBy', width: 15 },
      { key: 'postingDate', width: 15 },
      { key: 'bookingId', width: 15 },
      { key: 'hotelName', width: 25 },
      { key: 'hotelCity', width: 20 },
      { key: 'hotelState', width: 20 },
      { key: 'guestName', width: 25 },
      { key: 'checkIn', width: 15 },
      { key: 'checkOut', width: 15 },
      { key: 'nights', width: 10 },
      { key: 'noOfRooms', width: 12 }
    ];

    // Manually add headers to row 5
    const headerRow = worksheet.getRow(5);
    headerRow.getCell(1).value = 'SL. No';
    headerRow.getCell(2).value = 'Company Name';
    headerRow.getCell(3).value = 'Bank Name';
    headerRow.getCell(4).value = 'AC Number';
    headerRow.getCell(5).value = 'Transaction Date';
    headerRow.getCell(6).value = 'Value Date';
    headerRow.getCell(7).value = 'Amount';
    headerRow.getCell(8).value = 'Bank Narration';
    headerRow.getCell(9).value = 'DR';
    headerRow.getCell(10).value = 'CR';
    headerRow.getCell(11).value = 'Category';
    headerRow.getCell(12).value = 'Narration';
    headerRow.getCell(13).value = 'Posted By';
    headerRow.getCell(14).value = 'Posting Date';
    headerRow.getCell(15).value = 'Booking ID';

    // Hotel section headers
    headerRow.getCell(16).value = 'Hotel';
    headerRow.getCell(17).value = 'Hotel';
    headerRow.getCell(18).value = 'Hotel';

    // Booking Details section headers
    headerRow.getCell(19).value = 'Booking Details';
    headerRow.getCell(20).value = 'Booking Details';
    headerRow.getCell(21).value = 'Booking Details';
    headerRow.getCell(22).value = 'Booking Details';
    headerRow.getCell(23).value = 'Booking Details';

    // Style the header row (row 5)
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

    // Add sub-headers for Hotel and Booking Details in row 6
    const subHeaderRow = worksheet.getRow(6);
    subHeaderRow.getCell(16).value = 'Name';
    subHeaderRow.getCell(17).value = 'City';
    subHeaderRow.getCell(18).value = 'State';
    subHeaderRow.getCell(19).value = 'Guest Name';
    subHeaderRow.getCell(20).value = 'Check In';
    subHeaderRow.getCell(21).value = 'Check Out';
    subHeaderRow.getCell(22).value = 'Nights';
    subHeaderRow.getCell(23).value = 'No. of Rooms';

    // Style the sub-header row
    subHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    subHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    subHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add borders to sub-header row
    subHeaderRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows starting from row 7
    bankStatements.forEach((statement, index) => {
      const hotelInfo = statement.hotel ? {
        name: statement.hotel.name || 'N/A',
        city: statement.hotel.city ? statement.hotel.city.name : 'N/A',
        state: statement.hotel.state ? statement.hotel.state.name : 'N/A'
      } : { name: 'N/A', city: 'N/A', state: 'N/A' };

      // Use booking data if available, otherwise use N/A
      const bookingInfo = statement.booking ? {
        guestName: statement.booking.customers ? statement.booking.customers.name : 'N/A',
        checkIn: statement.booking.checkingDate ? new Date(statement.booking.checkingDate).toLocaleDateString() : 'N/A',
        checkOut: statement.booking.checkoutDate ? new Date(statement.booking.checkoutDate).toLocaleDateString() : 'N/A',
        nights: statement.booking.totalNight || 'N/A',
        noOfRooms: statement.booking.totalRooms || 'N/A'
      } : {
        guestName: 'N/A',
        checkIn: 'N/A',
        checkOut: 'N/A',
        nights: 'N/A',
        noOfRooms: 'N/A'
      };

      const row = worksheet.addRow({
        slNo: index + 1,
        companyName: companyName,
        bankName: statement.bankName || 'N/A',
        accountNumber: statement.accountNumber || 'N/A',
        transactionDate: statement.transactionDate ? new Date(statement.transactionDate).toLocaleDateString() : 'N/A',
        valueDate: statement.valueDate ? new Date(statement.valueDate).toLocaleDateString() : 'N/A',
        amount: Number(statement.amount || 0),
        bankNarration: statement.modeOfPayment || 'N/A',
        debit: Number(statement.debit || 0),
        credit: Number(statement.credit || 0),
        category: statement.category || 'N/A',
        narration: statement.narration || 'N/A',
        postedBy: statement.creator?.name || 'N/A',
        postingDate: statement.createdAt ? new Date(statement.createdAt).toLocaleDateString() : 'N/A',
        bookingId: statement.bookingId || 'N/A',
        hotelName: hotelInfo.name,
        hotelCity: hotelInfo.city,
        hotelState: hotelInfo.state,
        guestName: bookingInfo.guestName,
        checkIn: bookingInfo.checkIn,
        checkOut: bookingInfo.checkOut,
        nights: bookingInfo.nights,
        noOfRooms: bookingInfo.noOfRooms
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

      // Format currency columns
      const amountCell = row.getCell('amount');
      if (amountCell.value && typeof amountCell.value === 'number' && amountCell.value > 0) {
        amountCell.numFmt = '#,##0.00';
      }

      const debitCell = row.getCell('debit');
      if (debitCell.value && typeof debitCell.value === 'number' && debitCell.value > 0) {
        debitCell.numFmt = '#,##0.00';
      }

      const creditCell = row.getCell('credit');
      if (creditCell.value && typeof creditCell.value === 'number' && creditCell.value > 0) {
        creditCell.numFmt = '#,##0.00';
      }
    });

    // Add filters to header row
    worksheet.autoFilter = {
      from: 'A5',
      to: `X${bankStatements.length + 6}`
    };

    console.log('Bank statement Excel generation completed successfully');
    return workbook;
  } catch (error) {
    console.error('Error generating bank statement Excel report:', error);
    throw error;
  }
};
