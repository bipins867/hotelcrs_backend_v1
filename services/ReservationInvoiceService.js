const EmailService = require('./EmailService');
const { emailConfig } = require('../config/email');
const { numberToWords } = require('../utils/helper');
const TemplateHelper = require('../utils/templateHelper');
const { getObjectAsBase64 } = require('../utils/s3Helper');
const path = require('path');
const { GSTInvoice } = require('../db/models');

/**
 * ReservationInvoiceService
 * - Mirrors frontend TaxInvoice/GstInvoice logic for tax computation and totals
 * - Decides CGST/SGST vs IGST based on hotel vs customer GST state code (first 2 digits)
 * - Falls back to TaxInvoice when GSTIN is missing on either side (same as frontend)
 */
class ReservationInvoiceService extends EmailService {
  static getGstinStateCode(gstin) {
    if (!gstin || typeof gstin !== 'string') return null;
    const code = gstin.slice(0, 2);
    return code && code.match(/^\d{2}$/) ? code : null;
  }

  static pickTemplateType(reservation) {
    const hotelGstin = reservation?.hotels?.state?.gstDetails?.[0]?.gstNumber;
    const customerGstin = reservation?.customers?.gstNumber;
    if (!hotelGstin || !customerGstin) return 'TAX'; // matches frontend
    const hotelCode = this.getGstinStateCode(hotelGstin);
    const customerCode = this.getGstinStateCode(customerGstin);
    if (!hotelCode || !customerCode) return 'TAX';
    return hotelCode === customerCode ? 'TAX' : 'GST';
  }

  static getBankDetails(companyDetails) {
    if (Array.isArray(companyDetails?.bankDetails) && companyDetails.bankDetails.length > 0) {
      return companyDetails.bankDetails[0];
    }
    return {};
  }

  static toWords(amount) {
    const rounded = Math.round(Number(amount || 0));
    return `${numberToWords(rounded)} Rupees Only`;
  }

  static sumBaseRates(baseRates) {
    if (!Array.isArray(baseRates)) return 0;
    return baseRates.reduce((acc, r) => acc + Number(r || 0), 0);
  }

  static getGstRateForBase(baseAmount, companyDetails) {
    const less = Number(companyDetails?.gstPercentageLessThan7500 || 0);
    const more = Number(companyDetails?.gstPercentageGreaterThan7500 || 0);
    return Number(baseAmount) <= 7500 ? less : more;
  }

  static formatDateLong(dateIso) {
    if (!dateIso) return '';
    const d = new Date(dateIso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  static generateDatesBetween(startIso, endIso) {
    if (!startIso || !endIso) return [];
    const start = new Date(startIso);
    const end = new Date(endIso);
    const days = [];
    const cur = new Date(start);
    while (cur < end) {
      days.push(cur.toISOString());
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  /**
   * Compute invoice totals mirroring frontend components
   */
  static computeTotals(reservation, companyDetails, templateType) {
  const bookingDetails = reservation?.bookingDetails || [];
  const checkIn = reservation?.checkingDate;
  const checkOut = reservation?.checkoutDate;

  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let grandTotal = 0;
  let totalNights = 0;

  for (const row of bookingDetails) {
    const dates = this.generateDatesBetween(checkIn, checkOut);

    dates.forEach((dateIso, index) => {
      const baseRate = Array.isArray(row?.baseRate)
        ? Number(row.baseRate[index] || 0)
        : 0;

      const gstRate = this.getGstRateForBase(baseRate, companyDetails);
      const gstAmount = (baseRate * gstRate) / 100;

      const half = gstAmount / 2;

      totalNights += 1;

      if (templateType === "GST") {
        // IGST applies
        totalIgst += gstAmount;
      } else {
        // Same-state → CGST + SGST
        totalCgst += half;
        totalSgst += half;
      }

      grandTotal += baseRate + gstAmount;
    });
  }

  return {
    totalNights,
    totalCgst,
    totalSgst,
    totalIgst,
    grandTotal
  };
}

  static async buildHTML(reservation, options = {}) {
    const { forEmail = false, invoiceNumber = '' } = options;
    const companyDetails = reservation?.companyDetails;
    const bank = this.getBankDetails(companyDetails);
    const templateType = this.pickTemplateType(reservation); // 'TAX' or 'GST'

    const { grandTotal } = this.computeTotals(
      reservation,
      companyDetails,
      templateType
    );

    const amountInWords = this.toWords(grandTotal);

    let hotelLogo = reservation?.hotels?.logo;
    if (Array.isArray(hotelLogo)) {
      hotelLogo = hotelLogo[0];
    }

    let signature = companyDetails?.signatureImage;
    if (Array.isArray(signature)) {
      signature = signature[0];
    }

    let companyLogo = companyDetails?.companyLogo;
    
    if (Array.isArray(companyLogo)) {
      companyLogo = companyLogo[0];
    }

    const attachments = [];

    const resolveImage = async (key, fallbackCid) => {
      if (!key) return '';

      try {
        const dataUri = await getObjectAsBase64(key);
        if (!forEmail) {
          return dataUri;
        }

        const match = dataUri.match(/^data:(.*?);base64,(.*)$/);
        if (!match) {
          console.warn(`Failed to parse data URI for ${fallbackCid}`);
          return '';
        }
        const [, contentType = 'image/png', base64Payload = ''] = match;
        const normalizedPayload = base64Payload.replace(/\s+/g, '');
        const filename = path.basename(key) || `${fallbackCid}.png`;

        // Check attachment size (base64 is ~33% larger than binary)
        const sizeInBytes = (normalizedPayload.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        if (sizeInMB > 5) {
          console.warn(`Attachment ${filename} is ${sizeInMB.toFixed(2)}MB, which may cause issues. Consider resizing.`);
        }

        attachments.push({
          filename,
          content: normalizedPayload,
          encoding: 'base64',
          contentType,
          cid: fallbackCid
        });

        return `cid:${fallbackCid}`;
      } catch (error) {
        console.error(`Error processing image ${key} for ${fallbackCid}:`, error);
        return '';
      }
    };

    const companyLogoUrl = companyLogo ? await resolveImage(companyLogo, 'companyLogo') : '';
    const signatureUrl = signature ? await resolveImage(signature, 'signatureImage') : '';
    const hotelLogoUrl = hotelLogo ? await resolveImage(hotelLogo, 'hotelLogo') : '';
    
    const companyPhones = (companyDetails?.phones || []).map(p => p?.phone).filter(Boolean).join(', ');
    const companyEmails = (companyDetails?.emails || []).join(', ');
    const customerMobiles = (reservation?.customers?.mobile || []).join(', ');
    const customerEmails = (reservation?.customers?.email || []).join(', ');
    const hotelMobiles = (reservation?.hotels?.mobile || []).join(', ');
    const hotelEmails = (reservation?.hotels?.email || []).join(', ');

    const bookingSummaryRows = (reservation?.bookingDetails || []).map(row => (
      `<tr>
        <td>${row?.rooms?.roomName || ''}</td>
        <td>${row?.ratePlans?.name || ''}</td>
        <td>1</td>
        <td>${row?.totalAdults || 0}</td>
        <td>${row?.totalChild || 0}</td>
        <td>${reservation?.checkingDate || ''}</td>
        <td>${reservation?.checkoutDate || ''}</td>
      </tr>`
    )).join('');

    let billingRows = '';
    let totalNights = 0;
    let totalRoomAmount = 0;
    let taxCgst = 0;
    let taxSgst = 0;
    let taxIgst = 0;
    let totalGrand = 0;
    if (templateType === 'GST') {
      const checkIn = reservation?.checkingDate;
      const checkOut = reservation?.checkoutDate;

      billingRows = (reservation?.bookingDetails || []).map(row => {
        const dates = this.generateDatesBetween(checkIn, checkOut);

        return dates.map((dateIso, index) => {
          const baseRate = Array.isArray(row?.baseRate)
            ? Number(row.baseRate[index] || 0)
            : 0;

          const gstRate = this.getGstRateForBase(baseRate, companyDetails);
          const gstAmount = (baseRate * gstRate) / 100;

          totalNights += 1;
          taxIgst += gstAmount;
          totalGrand += baseRate + gstAmount;

          return `
            <tr>
              <td class="text-right">${this.formatDateLong(dateIso)}</td>
              <td class="text-center">${row?.rooms?.roomName || ''}</td>
              <td class="text-right">${baseRate}</td>
              <td class="text-right">${gstRate}%</td>
              <td class="text-right">1</td>
              <td class="text-right">${gstAmount}</td>
              <td class="text-right grand-total">${baseRate + gstAmount}</td>
            </tr>
          `;
        }).join('');
      }).join('');
    } else {
      // Per-day rows to replicate TaxInvoice.jsx
      const checkIn = reservation?.checkingDate;
      const checkOut = reservation?.checkoutDate;
      billingRows = (reservation?.bookingDetails || []).map(row => {
        const dates = this.generateDatesBetween(checkIn, checkOut);
        return dates.map((dateIso, index) => {
          const baseRate = Array.isArray(row?.baseRate) ? Number(row.baseRate[index] || 0) : 0;
          const gstRate = this.getGstRateForBase(baseRate, companyDetails);
          const gstAmount = (Number(baseRate) * Number(gstRate)) / 100;
          const half = gstAmount / 2;
          totalNights += 1;
          taxCgst += half;
          taxSgst += half;
          totalGrand += Number(baseRate) + gstAmount;
          return (
            `<tr>
              <td class="text-right">${this.formatDateLong(dateIso)}</td>
              <td class="text-center">${row?.rooms?.roomName || ''}</td>
              <td class="text-right">${baseRate}</td>
              <td class="text-right">${gstRate / 2}%</td>
              <td class="text-right">${gstRate / 2}%</td>
              <td class="text-right">1</td>
              <td class="text-right">${half}</td>
              <td class="text-right">${half}</td>
              <td class="text-right grand-total">${Number(baseRate) + gstAmount}</td>
            </tr>`
          );
        }).join('');
      }).join('');
    }

    const templateName = templateType === 'GST' ? 'gst-invoice-email' : 'tax-invoice-email';
    const html = TemplateHelper.processTemplate(await TemplateHelper.loadTemplate(templateName), {
      companyLogoUrl,
      hotelLogoUrl,
      companyName: companyDetails?.companyName || '',
      companyAddress: companyDetails?.address || '',
      companyPhones,
      companyEmails,
      companyPanNo: companyDetails?.panNo || '',
      companyHsnSac: companyDetails?.hsnSacCode || '',
      companyRegNo: companyDetails?.companyRegistrationNo || '',
      companyTanNo: companyDetails?.tanNo || '',
      hotelGstNumber: reservation?.hotels?.state?.gstDetails?.[0]?.gstNumber || '',
      customerName: reservation?.customers?.name || '',
      customerMobiles,
      customerEmails,
      customerGstNumber: reservation?.customers?.gstNumber || 'N/A',
      customerGstName: reservation?.customers?.gstName || 'N/A',
      customerGstAddress: reservation?.customers?.gstAddress || 'N/A',
      invoiceNumber: invoiceNumber,
      invoiceDate: reservation?.checkoutDate || '',
      pnr: reservation?.pnr || '',
      hotelName: reservation?.hotels?.name || '',
      hotelAddress: reservation?.hotels?.address || '',
      hotelMobiles,
      hotelEmails,
      bookingSummaryRows,
      billingRows,
      totalNights: String(totalNights),
      totalCgst: Number(taxCgst).toFixed(2),
      totalSgst: Number(taxSgst).toFixed(2),
      totalIgst: Number(taxIgst).toFixed(2),
      totalRoomAmount: Number(totalRoomAmount).toFixed(2),
      grandTotal: Number(totalGrand).toFixed(2),
      amountInWords,
      bankName: bank?.bankName || '',
      bankBranch: bank?.branchAddress || '',
      beneficiaryName: bank?.beneficiaryName || '',
      accountNumber: bank?.accountNumber || '',
      ifscCode: bank?.ifscCode || '',
      swiftCode: bank?.swiftCode || '',
      signatureUrl
    });
    return {
      html,
      attachments
    };
  }

  static extractPrimaryEmail(value) {
    if (!value) return null;
    if (Array.isArray(value)) return value[0] || null;
    return value;
  }

  static async sendReservationInvoiceEmails(reservation) {
    const { html, attachments } = await this.buildHTML(reservation, { forEmail: true });
    const hotelEmail = this.extractPrimaryEmail(reservation?.hotels?.email) || emailConfig.reservation;
    const adminEmail = emailConfig.adminEmail;

    const subject = `Tax Invoice - Booking ${reservation?.bookingId || reservation?.id}`;

    // Send a single email to hotel with admin in CC to avoid duplicates
    const to = hotelEmail ? [hotelEmail] : [];
    const cc = adminEmail ? [adminEmail] : [];
    if (!to.length && !cc.length) return;

    // Retry logic for TLS connection issues
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to send invoice email (attempt ${attempt}/${maxRetries})`);
        await EmailService.sendEmail({ to, cc, subject, html, attachments });
        console.log(`Invoice email sent successfully on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error;
        const isTlsError = error.message && error.message.includes('bad record mac');
        
        if (isTlsError && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`TLS error on attempt ${attempt}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = ReservationInvoiceService;


