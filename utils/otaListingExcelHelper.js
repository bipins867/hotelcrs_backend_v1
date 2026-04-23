const ExcelJS = require('exceljs');
const { CompanyDetails } = require('../db/models');

/**
 * Generate Excel report for OTA listings
 * Columns:
 * Hotel Name, City, State, Country,
 * OTA Name, Status, Listing Date, Listed By, Health Analysis, Live Status, Listing URL,
 * Approved By, Designation, Date of Approval
 */
exports.generateOtaListingExcelReport = async (otaListings) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('OTA Listings');

  const companyDetails = await CompanyDetails.findOne();
  const companyName = companyDetails?.companyName || 'World Choice Hotels Private Limited';

  // Header banner rows
  worksheet.getCell('A1').value = `${companyName} - Date of Download - ${new Date().toLocaleDateString('en-GB')}`;
  worksheet.getCell('A1').font = { bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };
  worksheet.mergeCells('A1:N1');

  worksheet.getCell('A2').value = 'OTA Listing Download';
  worksheet.getCell('A2').font = { bold: true };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  worksheet.mergeCells('A2:N2');

  // Spacing row
  worksheet.getRow(3).height = 10;

  worksheet.properties.defaultRowHeight = 20;
  worksheet.properties.defaultColWidth = 18;

  // Define columns (keys only). We'll inject headers manually at row 4.
  worksheet.columns = [
    { key: 'hotelName', width: 28 },
    { key: 'city', width: 18 },
    { key: 'state', width: 18 },
    { key: 'country', width: 18 },
    { key: 'otaName', width: 24 },
    { key: 'status', width: 16 },
    { key: 'listingDate', width: 18 },
    { key: 'listedBy', width: 20 },
    { key: 'healthAnalysis', width: 20 },
    { key: 'liveStatus', width: 16 },
    { key: 'listingUrl', width: 40 },
    { key: 'approvedBy', width: 20 },
    { key: 'designation', width: 18 },
    { key: 'dateOfApproval', width: 20 },
  ];

  // Insert header row at row 4
  const headers = [
    'Hotel Name', 'City', 'State', 'Country',
    'OTA Name', 'Status', 'Listing Date', 'Listed By', 'Health Analysis', 'Live Status', 'Listing URL',
    'Approved By', 'Designation', 'Date of Approval'
  ];
  worksheet.spliceRows(4, 0, headers);

  // Style header row (row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F3F5' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data rows
  otaListings.forEach((item, index) => {
    const hotel = item.hotel || {};
    const row = worksheet.addRow({
      hotelName: hotel.name || 'N/A',
      city: hotel.city?.name || 'N/A',
      state: hotel.state?.name || 'N/A',
      country: hotel.country?.name || 'N/A',
      otaName: item.otaName || 'N/A',
      status: item.status || 'N/A',
      listingDate: item.listingDate ? new Date(item.listingDate).toLocaleDateString('en-GB') : 'N/A',
      listedBy: item.listedBy || 'N/A',
      healthAnalysis: item.healthAnalysis || 'N/A',
      liveStatus: item.liveStatus || 'N/A',
      listingUrl: item.listingUrl || 'N/A',
      approvedBy: item.approvedBy || 'N/A',
      designation: item.designation || 'N/A',
      dateOfApproval: item.dateOfApproval ? new Date(item.dateOfApproval).toLocaleDateString('en-GB') : 'N/A',
    });

    // Borders for row
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Alternate row background
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F9FA' },
      };
    }
  });

  // Auto filter for all data rows
  const lastRowNumber = 4 + otaListings.length;
  worksheet.autoFilter = { from: 'A4', to: `N${lastRowNumber}` };

  return workbook;
};


