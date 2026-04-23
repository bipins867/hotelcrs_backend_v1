const ExcelJS = require('exceljs');
const { CompanyDetails } = require('../db/models');
const TemplateHelper = require('./templateHelper');
const { fetchGstDetails, paymentSummary } = require('./excelUtils');

/**
 * Generate Excel report for reservations
 * @param {Array} reservations - Array of reservation data
 * @param {Object} options - Report options
 * @returns {Promise<Buffer>} - Excel file buffer
 */
exports.generateReservationExcelReport = async (reservations, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reservation Report');
  const companyDetails = await CompanyDetails.findOne();
  const { gstPercentageLessThan7500, gstPercentageGreaterThan7500 } = companyDetails || {};

  // Set worksheet properties
  worksheet.properties.defaultRowHeight = 20;
  worksheet.properties.defaultColWidth = 15;

  // Define columns with proper formatting - using same headers as CSV
  worksheet.columns = [
    { header: 'Travel Agent', key: 'travelAgent', width: 20 },
    { header: 'PNR', key: 'pnr', width: 15 },
    { header: 'Booking No.', key: 'bookingId', width: 15 },
    { header: 'Customer', key: 'customerName', width: 25 },
    { header: 'Customer Mob.', key: 'customerMobile', width: 15 },
    { header: 'GST Holder Name', key: 'gstHolderName', width: 25 },
    { header: 'GST Holder Add.', key: 'gstHolderAddress', width: 30 },
    { header: 'GST No.', key: 'gstNumber', width: 20 },
    { header: 'Phone', key: 'hotelPhone', width: 15 },
    { header: 'Hotel', key: 'hotelName', width: 25 },
    { header: 'Hotel GST Registration Status', key: 'hotelGstRegStatus', width: 25 },
    { header: 'GST Invoice Issued to Guest By', key: 'gstInvoiceIssuedToGuestBy', width: 25 },
    { header: 'GST Return Filing Responsibility', key: 'gstReturnFilingResponsibility', width: 25 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'State', key: 'state', width: 15 },
    { header: 'Country', key: 'country', width: 15 },
    { header: 'Room', key: 'roomDetails', width: 25 },
    { header: 'Plan', key: 'planDetails', width: 20 },
    { header: 'Booking Date', key: 'bookingDate', width: 15 },
    { header: 'Checkin Date', key: 'checkinDate', width: 15 },
    { header: 'Checkout Date', key: 'checkoutDate', width: 15 },
    { header: 'No of Nights', key: 'totalNight', width: 12 },
    { header: 'Total Rooms', key: 'totalRooms', width: 12 },
    { header: 'Room Nights', key: 'roomNights', width: 12 },
    { header: 'Total Adults', key: 'totalAdults', width: 12 },
    { header: 'Total Children', key: 'totalChildren', width: 12 },
    { header: 'Extra Bed/Adult', key: 'extraBedCount', width: 12 },
    { header: 'Booking Type', key: 'bookingType', width: 15 },
    { header: 'Total Amt', key: 'totalAmount', width: 15 },
    { header: 'Sale Amt', key: 'saleAmt', width: 15 },
    { header: 'Net Amt', key: 'netAmt', width: 15 },
    { header: 'Hotel GST', key: 'hotelTaxes', width: 15 },
    { header: 'Display Rate', key: 'roomCharges', width: 15 },
    { header: 'Advance', key: 'advance', width: 15 },
    { header: 'Balance', key: 'balance', width: 15 },
    { header: 'Adjusted Amt', key: 'adjustedAmount', width: 15 },
    { header: 'OTA Commission', key: 'otaCommission', width: 15 },
    { header: 'Base Rate (OTA)', key: 'otaBaseRate', width: 15 },
    { header: 'GST Amount (OTA)', key: 'gstAmountOta', width: 15 },
    { header: 'GST On OTA Commission', key: 'gstOnOTACommission', width: 15 },
    { header: 'Total OTA Commission', key: 'totalOtaCommission', width: 15 },
    { header: 'TDS', key: 'tds', width: 15 },
    { header: 'TCS', key: 'tcs', width: 15 },
    { header: 'Total Deduction by OTAs', key: 'totalDeductionByOtas', width: 15 },
    { header: 'Margin', key: 'totalMargin', width: 15 },
    { header: 'Received Date', key: 'receivedDate', width: 15 },
    { header: 'Received Amount', key: 'receivedAmount', width: 15 },
    { header: 'Payment ID', key: 'receivedPaymentID', width: 15 },
    { header: 'Received Comments', key: 'receivedComments', width: 15 },
    { header: 'Payment Date', key: 'paidPaymentDate', width: 15 },
    { header: 'Paid Amount', key: 'paidAmount', width: 15 },
    { header: 'Paid Payment ID', key: 'paidPaymentID', width: 15 },
    { header: 'Paid Comments', key: 'paidComments', width: 15 }
  ];

  // Style the header row
  const headerRow = worksheet.getRow(1);
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

  // Add data rows - using same data structure as CSV
  reservations.forEach((reservation, index) => {
    const roomDetails = reservation.bookingDetails?.map(bookingDetail => bookingDetail.rooms?.roomName).join(', ');
    const planDetails = reservation.bookingDetails?.map(bookingDetail => bookingDetail.ratePlans?.name).join(', ');
    const adjustedAmount = reservation.payments?.reduce((sum, payment) => sum + (Number(payment.adjustmentAmount) || 0), 0);
    let receivedAmount = 0;
    let paidAmount = 0;

    reservation.payments?.forEach(payment => {
      if (payment.type === 'Received') {
        receivedAmount += Number(payment.amount);
      }
      if (payment.type === 'Paid') {
        paidAmount += Number(payment.amount);
      }
    });

    const extraBedCount = reservation?.bookingDetail?.reduce((total, booking) => total + Number(booking?.extraBed || 0), 0);
    const receivedDate = reservation.payments?.find(payment => payment.type === 'Received')?.paymentDate;
    const receivedPaymentID = reservation.payments?.find(payment => payment.type === 'Received')?.bankReference;
    const receivedComments = reservation.payments?.find(payment => payment.type === 'Received')?.note;

    const paidDate = reservation.payments?.find(payment => payment.type === 'Paid')?.paymentDate;
    const paidPaymentID = reservation.payments?.find(payment => payment.type === 'Paid')?.bankReference;
    const paidComments = reservation.payments?.find(payment => payment.type === 'Paid')?.note;

    const { grandTotalBaseRate, grandTotalGst } = fetchGstDetails(reservation, companyDetails);
    const { otaCommissionAmt, gstOnCommissionAmt, tcsAmt, tdsAmt, totalDeduction } = paymentSummary(reservation.hotels?.commission, companyDetails, grandTotalBaseRate, grandTotalGst);

    const totalNetPayableToHotels = Number(reservation?.totalPayableAmount) * (100 / (105));
    const hotelGst = Number(reservation?.totalPayableAmount) - totalNetPayableToHotels;

    const row = worksheet.addRow({
      travelAgent: reservation.travelPartner?.partnerName || 'N/A',
      pnr: reservation.pnr || 'N/A',
      bookingId: reservation.bookingId || 'N/A',
      customerName: reservation.customers?.name || 'N/A',
      customerMobile: reservation.customers?.mobile?.toString() || 'N/A',
      gstHolderName: reservation.customers?.gstName || 'N/A',
      gstHolderAddress: reservation.customers?.gstAddress || 'N/A',
      gstNumber: reservation.customers?.gstNumber || 'N/A',
      hotelPhone: reservation.hotels?.phone || 'N/A',
      hotelName: reservation.hotels?.name || 'N/A',
      city: reservation.hotels?.city?.name || 'N/A',
      state: reservation.hotels?.state?.name || 'N/A',
      country: reservation.hotels?.country?.name || 'N/A',
      roomDetails: roomDetails || 'N/A',
      planDetails: planDetails || 'N/A',
      bookingDate: TemplateHelper.formatDate(reservation.createdAt, 'DDMMYYYY') || 'N/A',
      checkinDate: TemplateHelper.formatDate(reservation.checkingDate, 'DDMMYYYY') || 'N/A',
      checkoutDate: TemplateHelper.formatDate(reservation.checkoutDate, 'DDMMYYYY') || 'N/A',
      totalNight: reservation.totalNight || 0,
      totalRooms: reservation.totalRooms || 0,
      roomNights: (reservation.totalNight || 0) * (reservation.totalRooms || 0),
      totalAdults: reservation.totalAdults || 0,
      totalChildren: reservation.totalChildren || 0,
      bookingType: reservation.paymentTypes?.name || 'N/A',
      totalAmount: reservation.netAmt || 0,
      saleAmt: reservation.saleAmt || 0,
      netAmt: reservation?.totalPayableAmount || 0,
      hotelTaxes: hotelGst || 0,
      roomCharges: reservation.roomCharges || 0,
      advance: reservation.advance || 0,
      balance: reservation.balance || 0,
      adjustedAmount: adjustedAmount || 0,
      otaCommission: reservation.otaCommission || 0,
      totalMargin: reservation.totalMargin || 0,
      receivedAmount: receivedAmount || 0,
      paidAmount: paidAmount || 0,
      hotelGstRegStatus: reservation?.hotels?.hotelGstRegStatus || 'N/A',
      gstInvoiceIssuedToGuestBy: reservation?.hotels?.gstInvoiceIssuedToGuestBy || 'N/A',
      gstReturnFilingResponsibility: reservation?.hotels?.gstReturnFilingResponsibility || 'N/A',
      extraBedCount: extraBedCount || 0,
      receivedDate: receivedDate || 'N/A',
      receivedPaymentID: receivedPaymentID || 'N/A',
      receivedComments: receivedComments || 'N/A',
      paidPaymentDate: paidDate || 'N/A',
      paidPaymentID: paidPaymentID || 'N/A',
      paidComments: paidComments || 'N/A',
      receivedAmount: receivedAmount || 0,
      paidAmount: paidAmount || 0,
      otaBaseRate: grandTotalBaseRate || 0,
      gstAmountOta: grandTotalGst || 0,
      gstOnOTACommission: gstOnCommissionAmt || 0,
      totalOtaCommission: otaCommissionAmt || 0,
      tds: tdsAmt || 0,
      tcs: tcsAmt || 0,
      totalDeductionByOtas: totalDeduction || 0,
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
    const currencyColumns = ['totalAmount', 'saleAmt', 'netAmt', 'hotelTaxes', 'roomCharges', 'advance', 'balance', 'adjustedAmount', 'otaCommission', 'totalMargin', 'receivedAmount', 'paidAmount'];
    currencyColumns.forEach(col => {
      const cell = row.getCell(col);
      if (cell.value && cell.value !== 'N/A') {
        cell.numFmt = '#,##0.00';
      }
    });
  });

  // Add summary section
  const summaryRow = reservations.length + 3;
  worksheet.getCell(`A${summaryRow}`).value = 'SUMMARY';
  worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell(`A${summaryRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF28A745' }
  };

  worksheet.getCell(`A${summaryRow}`).alignment = { horizontal: 'center' };

  // Calculate totals
  const totalNetAmount = reservations.reduce((sum, r) => sum + (Number(r.netAmt) || 0), 0);
  const totalSaleAmount = reservations.reduce((sum, r) => sum + (Number(r.saleAmt) || 0), 0);
  const totalCommission = reservations.reduce((sum, r) => sum + (Number(r.otaCommission) || 0), 0);
  const totalAdvance = reservations.reduce((sum, r) => sum + (Number(r.advance) || 0), 0);
  const totalBalance = reservations.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
  const totalMargin = reservations.reduce((sum, r) => sum + (Number(r.totalMargin) || 0), 0);

  const summaryData = [
    { label: 'Total Reservations:', value: reservations.length },
    { label: 'Total Net Amount:', value: totalNetAmount, format: 'currency' },
    { label: 'Total Sale Amount:', value: totalSaleAmount, format: 'currency' },
    { label: 'Total Commission:', value: totalCommission, format: 'currency' },
    { label: 'Total Advance:', value: totalAdvance, format: 'currency' },
    { label: 'Total Balance:', value: totalBalance, format: 'currency' },
    { label: 'Total Margin:', value: totalMargin, format: 'currency' }
  ];

  summaryData.forEach((item, index) => {
    const rowNum = summaryRow + 1 + index;
    worksheet.getCell(`A${rowNum}`).value = item.label;
    worksheet.getCell(`A${rowNum}`).font = { bold: true };
    worksheet.getCell(`B${rowNum}`).value = item.value;
    worksheet.getCell(`B${rowNum}`).font = { bold: true };

    // Add borders to summary cells
    worksheet.getCell(`A${rowNum}`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheet.getCell(`B${rowNum}`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    if (item.format === 'currency') {
      worksheet.getCell(`B${rowNum}`).numFmt = '#,##0.00';
    }
  });

  // Add filters to header row
  worksheet.autoFilter = {
    from: 'A1',
    to: `AJ${reservations.length + 2}`
  };

  // Add report metadata
  const metadataRow = reservations.length + summaryData.length + 5;
  worksheet.getCell(`A${metadataRow}`).value = 'Report Generated On:';
  worksheet.getCell(`B${metadataRow}`).value = new Date().toLocaleString();
  worksheet.getCell(`A${metadataRow + 1}`).value = 'Total Records:';
  worksheet.getCell(`B${metadataRow + 1}`).value = reservations.length;

  return workbook;
};

/**
 * Generate Excel report for reservations with payment details
 * @param {Array} reservations - Array of reservation data
 * @param {Object} options - Report options
 * @returns {Promise<Buffer>} - Excel file buffer
 */
exports.generateReservationBookingExcelReport = async (reservations, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reservation Payment Report');

  // Set worksheet properties
  worksheet.properties.defaultRowHeight = 20;
  worksheet.properties.defaultColWidth = 15;

  // Define columns with proper formatting
  worksheet.columns = [
    { header: 'Hotel', key: 'hotelName', width: 25 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'State', key: 'state', width: 15 },
    { header: 'Country', key: 'country', width: 15 },
    { header: 'Travel Agent', key: 'travelAgent', width: 20 },
    { header: 'PNR', key: 'pnr', width: 15 },
    { header: 'Booking Status', key: 'bookingStatus', width: 15 },
    { header: 'Customer', key: 'customerName', width: 25 },
    { header: 'Customer Mob.', key: 'customerMobile', width: 15 },
    { header: 'GST Holder Name', key: 'gstHolderName', width: 25 },
    { header: 'GST Holder Add.', key: 'gstHolderAddress', width: 30 },
    { header: 'GST No.', key: 'gstNumber', width: 20 },
    { header: 'Booking Date', key: 'bookingDate', width: 15 },
    { header: 'Checkin Date', key: 'checkinDate', width: 15 },
    { header: 'Checkout Date', key: 'checkoutDate', width: 15 },
    { header: 'Total Rooms', key: 'totalRooms', width: 12 },
    { header: 'No. of Nights', key: 'totalNight', width: 12 },
    { header: 'Room Type', key: 'roomType', width: 20 },
    { header: 'Plan', key: 'planDetails', width: 20 },
    { header: 'Total Adults', key: 'totalAdults', width: 12 },
    { header: 'Total Children', key: 'totalChildren', width: 12 },
    { header: 'Booking Type', key: 'bookingType', width: 15 },
    { header: 'Net Amt', key: 'netAmt', width: 15 },
    { header: 'Adjusted Amount', key: 'adjustedAmount', width: 15 },
    { header: 'Adjusted Note', key: 'adjustedNote', width: 25 },
    { header: 'Paid', key: 'paidAmount', width: 15 },
    { header: 'Balance Amt.', key: 'balanceAmount', width: 15 },
    { header: 'Payment Date', key: 'paymentDate', width: 15 },
    { header: 'Bank Reference No.', key: 'bankReferenceNo', width: 20 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 }
  ];

  // Style the header row
  const headerRow = worksheet.getRow(1);
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
  reservations.forEach((reservation, index) => {
    const roomDetails = reservation.bookingDetails?.map(bookingDetail => bookingDetail.rooms?.roomName).join(', ');
    const planDetails = reservation.bookingDetails?.map(bookingDetail => bookingDetail.ratePlans?.name).join(', ');
    const adjustedAmount = reservation.payments?.reduce((sum, payment) => sum + (Number(payment.adjustmentAmount) || 0), 0);
    const adjustedNote = reservation.payments?.map(payment => payment.adjustmentBooking).filter(note => note).join(', ');
    let paidAmount = 0;
    let balanceAmount = 0;
    let paymentDate = [];
    let bankReferenceNo = [];
    let paymentStatus = 'Pending';

    reservation.payments?.forEach(payment => {
      if (payment.type === 'Paid') {
        paidAmount += Number(payment.amount);
        paymentStatus = 'Done';
      }
      bankReferenceNo.push(payment.bankReference);
      paymentDate.push(payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '');
    });

    if (['Cancel', 'No Show', 'PLB'].includes(reservation.status)) {
      paymentStatus = reservation.status;
    }


    // Calculate balance amount
    balanceAmount = (Number(reservation.netAmt) || 0) - paidAmount;

    const row = worksheet.addRow({
      hotelName: reservation.hotels?.name || 'N/A',
      city: reservation.hotels?.city?.name || 'N/A',
      state: reservation.hotels?.state?.name || 'N/A',
      country: reservation.hotels?.country?.name || 'N/A',
      travelAgent: reservation.travelPartner?.partnerName || 'N/A',
      pnr: reservation.pnr || 'N/A',
      bookingStatus: reservation.status || 'N/A',
      customerName: reservation.customers?.name || 'N/A',
      customerMobile: reservation.customers?.mobile?.toString() || 'N/A',
      gstHolderName: reservation.customers?.gstName || 'N/A',
      gstHolderAddress: reservation.customers?.gstAddress || 'N/A',
      gstNumber: reservation.customers?.gstNumber || 'N/A',
      bookingDate: TemplateHelper.formatDate(reservation.createdAt, 'DDMMYYYY') || 'N/A',
      checkinDate: TemplateHelper.formatDate(reservation.checkingDate, 'DDMMYYYY') || 'N/A',
      checkoutDate: TemplateHelper.formatDate(reservation.checkoutDate, 'DDMMYYYY') || 'N/A',
      totalRooms: reservation.totalRooms || 0,
      totalNight: reservation.totalNight || 0,
      roomType: roomDetails || 'N/A',
      planDetails: planDetails || 'N/A',
      totalAdults: reservation.totalAdults || 0,
      totalChildren: reservation.totalChildren || 0,
      bookingType: reservation.paymentTypes?.name || 'N/A',
      netAmt: reservation.totalPayableAmount || 0,
      adjustedAmount: adjustedAmount || 0,
      adjustedNote: adjustedNote || 'N/A',
      paidAmount: paidAmount || 0,
      balanceAmount: balanceAmount || 0,
      paymentDate: paymentDate.join(', ') || 'N/A',
      bankReferenceNo: bankReferenceNo.join(', ') || 'N/A',
      paymentStatus: paymentStatus
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
    const currencyColumns = ['netAmt', 'adjustedAmount', 'paidAmount', 'balanceAmount'];
    currencyColumns.forEach(col => {
      const cell = row.getCell(col);
      if (cell.value && cell.value !== 'N/A') {
        cell.numFmt = '#,##0.00';
      }
    });
  });

  // Add summary section
  const summaryRow = reservations.length + 3;
  worksheet.getCell(`A${summaryRow}`).value = 'BOOKING REPORT SUMMARY';
  worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell(`A${summaryRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF28A745' }
  };
  worksheet.getCell(`A${summaryRow}`).alignment = { horizontal: 'center' };

  // Calculate totals
  const totalNetAmount = reservations.reduce((sum, r) => sum + (Number(r.netAmt) || 0), 0);
  const totalAdjustedAmount = reservations.reduce((sum, r) => {
    const adjusted = r.payments?.reduce((sum, payment) => sum + (Number(payment.adjustmentAmount) || 0), 0) || 0;
    return sum + adjusted;
  }, 0);
  const totalPaidAmount = reservations.reduce((sum, r) => {
    const paid = r.payments && r.payments.length > 0 ? Number(r.payments[r.payments.length - 1].amount) || 0 : 0;
    return sum + paid;
  }, 0);
  const totalBalanceAmount = totalNetAmount - totalPaidAmount;

  const summaryData = [
    { label: 'Total Reservations:', value: reservations.length },
    { label: 'Total Net Amount:', value: totalNetAmount, format: 'currency' },
    { label: 'Total Adjusted Amount:', value: totalAdjustedAmount, format: 'currency' },
    { label: 'Total Paid Amount:', value: totalPaidAmount, format: 'currency' },
    { label: 'Total Balance Amount:', value: totalBalanceAmount, format: 'currency' }
  ];

  summaryData.forEach((item, index) => {
    const rowNum = summaryRow + 1 + index;
    worksheet.getCell(`A${rowNum}`).value = item.label;
    worksheet.getCell(`A${rowNum}`).font = { bold: true };
    worksheet.getCell(`B${rowNum}`).value = item.value;
    worksheet.getCell(`B${rowNum}`).font = { bold: true };

    // Add borders to summary cells
    worksheet.getCell(`A${rowNum}`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheet.getCell(`B${rowNum}`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    if (item.format === 'currency') {
      worksheet.getCell(`B${rowNum}`).numFmt = '#,##0.00';
    }
  });

  // Add filters to header row
  worksheet.autoFilter = {
    from: 'A1',
    to: `Z${reservations.length + 2}`
  };

  // Add report metadata
  const metadataRow = reservations.length + summaryData.length + 5;
  worksheet.getCell(`A${metadataRow}`).value = 'Report Generated On:';
  worksheet.getCell(`B${metadataRow}`).value = new Date().toLocaleString();
  worksheet.getCell(`A${metadataRow + 1}`).value = 'Total Records:';
  worksheet.getCell(`B${metadataRow + 1}`).value = reservations.length;

  return workbook;
};