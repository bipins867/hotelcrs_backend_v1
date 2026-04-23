const EmailService = require('./EmailService');
const { emailConfig } = require('../config/email');
const TemplateHelper = require('../utils/templateHelper');
const { getCompanyDetails } = require('../utils/common');
const { getGstAmount, getGstRate } = require('../helper/reservation');
const { PAYMENT_TYPE_OPTIONS } = require('../utils/helper');
const { fetchGstDetails, paymentSummary } = require('../utils/excelUtils');

class ReservationEmailService {
  /**
   * Build a safe payload for email rendering using live relations with
   * fallbacks from reservation.oldData snapshot captured at creation/update.
   */
  static buildEmailPayload(reservations) {
    try {
      const reservation = reservations?.toJSON ? reservations?.toJSON() : reservations;
      const snapshot = reservation?.oldData || {};

      // Prefer live relations, fallback to snapshot when missing
      const merged = {
        ...reservation,
        bookingDetails: reservation?.bookingDetails?.map((booking) => {
          const oldData = reservation?.oldData?.bookingDetails?.find((b) => b.id === booking.id);
          return {
            ...booking,
            rooms: oldData?.rooms || booking.rooms,
            ratePlans: oldData?.ratePlans || booking.ratePlans,
          };
        }),
        customers: snapshot?.customers || {},
        hotels: snapshot?.hotels || {},
        travelPartner: snapshot?.travelPartner || {},
        paymentTypes: snapshot?.paymentTypes || {},
        companyDetails: snapshot?.companyDetails || {},
      };

      return merged;
    } catch (err) {
      console.warn('[ReservationEmailService] Failed to build email payload with oldData fallback:', err);
      return reservation;
    }
  }
  /**
   * Generate reservation email HTML template for hotel
   * @param {Object} reservation - Reservation data with all related information
   * @returns {Promise<string>} HTML content
   */
  static async generateHotelEmailHTML(reservation) {
    try {
      const templateData = await TemplateHelper.prepareCommonData(reservation, false, true);

      // Fetch company details for panNumber and companyRegNumber
      const companyDetails = await getCompanyDetails({ forEmail: true, oldData: reservation?.companyDetails });

      // Build Direct Payment section for hotel email when applicable
      const isDirectPayment = reservation?.paymentTypes?.name === 'Direct Payment';
      const hotelDirectPaymentHTML = isDirectPayment
        ? `
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background:#ffffff; margin:0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family:Arial, Helvetica, sans-serif; padding: 10px; text-align:left;">
              <table border="1" bordercolor="#cccccc" width="100%" cellpadding="8" cellspacing="0" style="font-size:13px; font-family:Arial, Helvetica, sans-serif; color: #444;">
                <tbody>
                  <tr>
                    <td colspan="2" style="text-align:center; font-weight:bold;   vertical-align:top;  font-family:arial; background-color: #f3ba0e;">
                      DIRECT PAYMENT COLLECTION - COLLECT THE BELOW AMOUNT FROM THE GUEST:</td>
                  </tr>
                  <tr style="background-color: #df9d93;">
                    <td width="50%" style="text-align:left;  vertical-align:top;  font-family:arial">TOTAL AMOUNT TO BE PAID BY THE GUEST</td>
                    <td width="50%" style="text-align:left; vertical-align:center;  font-family:arial">INR ${templateData.totalAmount}</td>
                  </tr>
                  <tr style="background-color: #f3ba0e;">
                    <td width="50%" style="text-align:left;  vertical-align:top;  font-family:arial">ADVANCE COLLECTED FROM THE GUEST</td>
                    <td width="50%" style="text-align:left;  vertical-align:center;  font-family:arial">INR ${templateData.advanceAmount}</td>
                  </tr>
                  <tr style="background-color: #93bcdf;">
                    <td width="50%" style="text-align:left;  vertical-align:top;  font-family:arial">BALANCE TO BE COLLECTED</td>
                    <td width="50%" style="text-align:left;  vertical-align:center;  font-family:arial">INR ${templateData.balanceAmount}</td>
                  </tr>
                  <tr style="background-color: #f3ba0e;">
                    <td width="50%" style="text-align:left;  vertical-align:top;  font-family:arial">INSTRUCTION FOR COLLECTION</td>
                    <td width="50%" style="text-align:left;  vertical-align:center;  font-family:arial">Please Collect INR ${templateData.balanceAmount} from the Guest directly.</td>
                  </tr>
                  <tr style="background-color: #f3ba0e;">
                    <td width="50%" style="text-align:left;  vertical-align:top;  font-family:arial">WHEN TO COLLECT PAYMENT</td>
                    <td width="50%" style="text-align:left;  vertical-align:center;  font-family:arial">Collect Balance Payment from the guest at the time of check in or check out. </td>
                  </tr>
                  <tr style="background-color: #d7e1e9;">
                    <td width="50%" style="text-align:left;  vertical-align:top;  font-family:arial">EXTRAS - ALL OTHER EXPENCES</td>
                    <td width="50%" style="text-align:left;  vertical-align:center;  font-family:arial">Collect all the other expences, extras directly from the guest</td>
                  </tr>
                  <tr style="background-color: #d7e1e9;">
                    <td width="50%" style="text-align:left;  vertical-align:top;  font-family:arial" rowspan="4">RESPONSIBILITY OF PAYMENT</td>
                    <td width="50%" style="text-align:left;  vertical-align:center;  font-family:arial">We are only responsible for advance payment which we have collected from the guest. Hotel has to collect the balance payment from the guest. Company will not be responsible in case of hotel fail or forget to collect the amount as stated.</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      `
        : '';

      // Financial Information section mirrored from frontend FinancialInformation.jsx
      // const gstRate = getGstRate(reservation?.oldData?.companyDetails, Number(reservation?.netAmt || 0));
      const gstRate = 5;
      const netAmount = Number(reservation?.totalPayableAmount || 0) * (100 / (100 + gstRate));
      const gstAmt = Number(reservation?.totalPayableAmount || 0) - netAmount;
      const nettPayable = netAmount + gstAmt;
      const saleAmt = Number(reservation?.saleAmt || 0);
      const differenceAmount = saleAmt - Number(reservation?.netAmt || 0);
      const advanceAmount = Number(reservation?.advance || 0);
      const balanceToBePaid = Number(reservation?.netAmt || 0) - advanceAmount - Number(reservation?.totalPayableAmount || 0);
      const paymentTypeName = reservation?.paymentTypes?.name || '';
      const isPaymentForfeited = paymentTypeName === 'PAYMENT FORFEITED';
      const nonDirectRowLabel = isPaymentForfeited ? 'OTA to Pay Hotel (A + B)' : 'Total Net Payable To Hotels';

      const financialInformationHTML = `
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background:#ffffff; margin:0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family:Arial, Helvetica, sans-serif; padding: 10px; text-align:left;">
              <table border="1" bordercolor="#cccccc" width="100%" cellpadding="8" cellspacing="0" style="font-size:12px; font-family:Arial, Helvetica, sans-serif; color: #444;">
                <tbody>
                  <tr>
                    <td colspan="2">
                      <h4 style="text-transform:uppercase; font-size:12px; font-weight:bold;  margin:0px 5px; padding:5px 0 5px; text-align:center;font-family:arial;">FINANCIAL INFORMATION:</h4>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2"><b>NOTE: The rate information displayed below is a NET RATE. Do not disclose this rate to the guest.</b></td>
                  </tr>
                  <tr>
                    <td width="70%">
                      <p style="text-align:left; font-size:14px; color:#878787;  vertical-align:top;margin:0px; font-family:arial">(A) Room Charges</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px; color:#878787;  vertical-align:center;  font-family:arial; text-transform:uppercase;">INR ${netAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td width="70%">
                      <p style="text-align:left; font-size:14px; color:#878787;  margin:0px; vertical-align:top;  font-family:arial">(B) GST Amount</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px; color:#878787;  vertical-align:center;  font-family:arial; text-transform:uppercase;">INR ${gstAmt.toFixed(2)}</td>
                  </tr>
                  ${!isDirectPayment ? `
                  <tr style="background-color: #b0dc7d">
                    <td width="70%">
                      <p style="text-align:left; font-size:14px; color:#000;  vertical-align:top;  font-family:arial; font-weight:bold; margin:0px;">${nonDirectRowLabel}</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px; color:#000;  vertical-align:center;font-weight:bold;  font-family:arial; text-transform:uppercase;">INR ${Number(reservation?.totalPayableAmount || 0).toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  ${isDirectPayment ? `
                  <tr>
                    <td width="70%">
                      <p style="text-align:left; font-size:14px; color:#ff7518;  vertical-align:top;  font-family:arial; font-weight:bold; margin:0px;">Nett Payable to Hotel (A + B)</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px; color:#ff7518;  vertical-align:center;font-weight:bold;  font-family:arial; text-transform:uppercase;">INR ${reservation?.totalPayableAmount.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: orange">
                    <td width="70%">
                      <p style="text-align:left; font-size:14px;  vertical-align:top;  font-family:arial; font-weight:bold; margin:0px;">Hotel Needs To Collect From Traveler</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px;  vertical-align:center;font-weight:bold;  font-family:arial; text-transform:uppercase;">INR ${Number(reservation?.netAmt || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td width="70%">
                      <p style="text-align:left; font-size:14px; color:#ff7518;  vertical-align:top;  font-family:arial; font-weight:bold; margin:0px;">Difference Amount (Commission) - OTA & Company</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px; color:#ff7518;  vertical-align:center;font-weight:bold;  font-family:arial; text-transform:uppercase;">INR ${Number(reservation?.otaCommission || 0).toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #f5e340;">
                    <td width="70%">
                      <p style="text-align:left; font-size:14px; vertical-align:top;  font-family:arial; font-weight:bold; margin:0px;">Advance Collected</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px; vertical-align:center;font-weight:bold;  font-family:arial; text-transform:uppercase;">INR ${advanceAmount.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #f5e340;">
                    <td width="70%">
                      <p style="text-align:left; font-size:14px; vertical-align:top;  font-family:arial; font-weight:bold; margin:0px;">Balance To Be Paid By Hotel or Company</p>
                    </td>
                    <td width="30%" style="text-align:left; font-size:15px; vertical-align:center;font-weight:bold;  font-family:arial; text-transform:uppercase;">INR ${balanceToBePaid.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="background-color: #64aded; font-size: 14px; text-align: center; font-weight: bold"><b>Minus (-) Amount: If the amount is negative (-), it means that the company owes money to the hotel. In this case, the company needs to pay the hotel the specified amount.</b></td>
                  </tr>
                  <tr>
                    <td colspan="2" style="background-color: #f5e340; font-size: 14px;text-align: center; font-weight: bold"><b>Plus (+) Amount: If the amount is positive (+), it means that the hotel owes money to the company. In this case, the hotel needs to pay the company the specified amount.</b></td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>`;

      const otaSettlementHTMLHotel = reservation?.isGstRelated ? this.generateOTASettlementHTML(reservation, companyDetails) : '';

      // Add hotel-specific data based on frontend template structure
      const hotelSpecificData = {
        ...templateData,
        // Hotel-specific fields from frontend components
        hotelNote: reservation.hotelNote,
        pnr: reservation.pnr || "N/A",
        hotelDirectPaymentHTML,
        financialInformationHTML,

        // Financial calculations based on frontend FinancialInformation component
        netAmountForHotel: netAmount.toFixed(2),
        gstAmountForHotel: gstAmt.toFixed(2),
        nettPayableToHotel: nettPayable.toFixed(2),
        hotelNeedsToCollect: saleAmt.toFixed(2),
        differenceAmount: differenceAmount.toFixed(2),
        advanceCollected: advanceAmount.toFixed(2),
        balanceToBePaidByHotel: balanceToBePaid.toFixed(2),

        // Payment type information
        paymentType: reservation.paymentTypes?.name,

        // Status information
        reservationStatus: reservation.status,
        policyDetails: this.generateAdminHotelPolicyHTML(reservation),
        bookingUrl: `${emailConfig.frontendUrl}/reservation-management/reservation/confirm/${reservation?.bookingId}`,

        // Company information for footer
        panNumber: companyDetails?.panNo || 'N/A',
        companyRegNumber: companyDetails?.companyRegistrationNo || 'N/A',
        totalPayableAmount: Number(reservation?.totalPayableAmount).toFixed(2),
        otaSettlementHTML: otaSettlementHTMLHotel
      };

      const htmlContent = await TemplateHelper.loadAndProcessTemplate('hotel-reservation', hotelSpecificData);

      // Replace data-bg-color attribute with background-color in the existing style attribute
      const processedHtml = htmlContent.replace(
        /style="([^"]*)"[^>]*data-bg-color="([^"]*)"/g,
        (match, existingStyle, color) => {
          return `style="${existingStyle}; background-color: ${templateData?.titleColor}"`;
        }
      );

      return processedHtml;

    } catch (error) {
      console.error('Error generating hotel email HTML:', error);
      throw error;
    }
  }

  /**
   * Generate reservation email HTML template for admin
   * @param {Object} reservation - Reservation data with all related information
   * @returns {Promise<string>} HTML content
   */
  static async generateAdminEmailHTML(reservation) {
    try {
      const templateData = await TemplateHelper.prepareCommonData(reservation, true, false, false);

      // Fetch company details for panNumber and companyRegNumber
      const companyDetails = await getCompanyDetails({ forEmail: true });

      // Calculate financial amounts based on frontend AdminVouchers component
      let calculatePrice = 0;
      // const gstRate = getGstRate(reservation?.oldData?.companyDetails, reservation?.netAmt);
      const gstRate = 5;
      let roomChargeAmount = 0;
      let roomChargeGst = 0;

      if (reservation?.paymentTypes?.name === PAYMENT_TYPE_OPTIONS.DIRECT_PAYMENT) {
        roomChargeAmount = Number(reservation?.roomCharges) || 0;
        roomChargeGst = Number(reservation?.hotelTaxes) || 0;
      } else {
        roomChargeAmount = Number(reservation?.netAmt) * (100 / (100 + gstRate));
        roomChargeGst = Number(reservation?.netAmt) - roomChargeAmount;
      }

      const netRateMargin = Number(reservation?.netAmt) - Number(reservation?.totalPayableAmount) - Number(reservation?.otaCommission);
      const otaSettlementHTMLHotel = this.generateOTASettlementHTML(reservation, companyDetails);
      // Add admin-specific data based on frontend AdminVouchers component
      const adminSpecificData = {
        ...templateData,

        // Financial calculations (exact same as frontend)
        adminNote: reservation?.adminNote || 'N/A',
        roomChargeAmount: roomChargeAmount.toFixed(2),
        roomChargeGst: roomChargeGst.toFixed(2),
        calculatePrice: calculatePrice.toFixed(2),
        netRateMargin: netRateMargin.toFixed(2),
        totalPayableAmount: Number(reservation?.totalPayableAmount).toFixed(2),

        // Payment type for conditional rendering
        isDirectPayment: reservation?.paymentTypes?.name,

        // Hotel information
        hotelName: reservation.hotels?.name || 'N/A',
        hotelEmail: reservation.hotels?.email || 'N/A',
        hotelPhone: reservation.hotels?.phone || 'N/A',
        hotelAddress: reservation.hotels?.address || 'N/A',

        // Customer information
        customerName: reservation.customers?.name || 'N/A',
        customerEmail: reservation.customers?.email || 'N/A',
        customerPhone: reservation.customers?.phone || reservation.customers?.mobile || 'N/A',
        customerAddress: reservation.customers?.address || 'N/A',

        // Booking information
        bookingId: reservation.bookingId || 'N/A',
        pnr: reservation.pnr || 'N/A',
        checkInDate: TemplateHelper.formatDate(reservation.checkingDate, 'long'),
        checkOutDate: TemplateHelper.formatDate(reservation.checkoutDate, 'long'),
        totalNights: reservation.totalNight || 0,
        totalRooms: reservation.totalRooms || 0,
        totalAdults: reservation.totalAdults || 0,
        totalChildren: reservation.totalChildren || 0,

        // Payment information
        paymentType: reservation.paymentTypes?.name || 'N/A',
        saleAmount: reservation.saleAmt || 0,
        netAmount: reservation.netAmt || 0,
        advance: reservation.advance || 0,
        balance: reservation.balance || 0,

        // Financial information from hotel (payload already merged with oldData when applicable)
        bankName: reservation.hotels?.financialInformation?.bankName || 'N/A',
        beneficiaryName: reservation.hotels?.financialInformation?.beneficiaryName || 'N/A',
        accountName: reservation.hotels?.financialInformation?.beneficiaryName || 'N/A', // Same as beneficiaryName
        accountNumber: reservation.hotels?.financialInformation?.accountNumber || 'N/A',
        ifscCode: reservation.hotels?.financialInformation?.ifscCode || 'N/A',

        // OTA commission details
        roomCharges: reservation.roomCharges || 0,
        hotelTaxes: reservation.hotelTaxes || 0,
        otaCommission: reservation.otaCommission || 0,

        // Comments
        comments: reservation.comments || 'N/A',

        // Policy information
        cancellationPolicies: this.generateAdminHotelPolicyHTML(reservation),

        // Additional fields for admin template
        totalInfants: reservation.bookingDetails?.reduce((acc, detail) => {
          for (const age of detail.childAge || []) {
            if (Number(age) >= 0 && Number(age) <= 5) {
              acc += 1;
            }
          }
          return acc;
        }, 0) || 0,

        // Financial calculations for admin template
        saleRate: calculatePrice.toFixed(2),
        netRate: Number(reservation?.netAmt || 0).toFixed(2),
        financialTotalRateLable: reservation?.paymentTypes?.name == PAYMENT_TYPE_OPTIONS.DIRECT_PAYMENT ? "WCH to Pay Hotel (A + B)" : "Sale Amount",
        serviceCharges: 0,
        margin: netRateMargin.toFixed(2),

        // Customer GST information (payload already merged with oldData when applicable)
        customerGstNumber: reservation.customers?.gstNumber || 'N/A',
        customerGstName: reservation.customers?.gstName || 'N/A',
        customerGstAddress: reservation.customers?.gstAddress || 'N/A',

        // Company information for footer
        stateCode: reservation.hotels?.state?.gstDetails?.[0]?.code || 'N/A',
        panNumber: companyDetails?.panNo || 'N/A',
        companyRegNumber: companyDetails?.companyRegistrationNo || 'N/A',

        // Direct Payment HTML section (only for Direct Payment type)
        adminDirectPaymentHTML: reservation?.paymentTypes?.name === PAYMENT_TYPE_OPTIONS.DIRECT_PAYMENT
          ? this.generateAdminDirectPaymentHTML(reservation)
          : '',
        otaSettlementHTML: otaSettlementHTMLHotel,
      };

      const htmlContent = await TemplateHelper.loadAndProcessTemplate('admin-reservation', adminSpecificData);

      // Replace data-bg-color attribute with background-color in the existing style attribute
      const processedHtml = htmlContent.replace(
        /style="([^"]*)"[^>]*data-bg-color="([^"]*)"/g,
        (match, existingStyle, color) => {
          return `style="${existingStyle}; background-color: ${templateData?.titleColor}"`;
        }
      );

      return processedHtml;
    } catch (error) {
      console.error('Error generating admin email HTML:', error);
      throw error;
    }
  }

  /**
   * Generate reservation email HTML template for customer
   * @param {Object} reservation - Reservation data with all related information
   * @returns {Promise<string>} HTML content
   */
  static async generateCustomerEmailHTML(reservation) {
    try {
      const templateData = await TemplateHelper.prepareCommonData(reservation, false, false, true);

      // Fetch company details for panNumber and companyRegNumber
      const companyDetails = await getCompanyDetails({ forEmail: true });

      // Calculate financial amounts based on frontend CustomerVouchers component
      const netAmount = getGstAmount(reservation?.oldData?.companyDetails, Number(reservation?.netAmt || 0));
      const gstAmt = getGstAmount(reservation?.oldData?.companyDetails, netAmount);
      const totalAmount = netAmount + gstAmt;

      // Calculate total infants for customer view
      const totalInfants = reservation.bookingDetails?.reduce((acc, detail) => {
        for (const age of detail.childAge || []) {
          if (Number(age) >= 0 && Number(age) <= 5) {
            acc += 1;
          }
        }
        return acc;
      }, 0) || 0;

      // Get payment type for conditional rendering
      const paymentType = reservation.paymentTypes?.name;

      // Generate room details HTML for customer view
      const roomDetailsHTML = this.generateCustomerRoomDetailsHTML(reservation.bookingDetails || []);

      // Generate direct payment section HTML if applicable
      const directPaymentHTML = paymentType === 'Direct Payment' ? this.generateDirectPaymentHTML(reservation, netAmount, gstAmt, totalAmount) : '';

      // Generate GST information HTML
      const gstInformationHTML = this.generateGSTInformationHTML(reservation);

      // Generate policy HTML
      const policyHTML = this.generateCustomerPolicyHTML(reservation);

      // Generate footer HTML
      const footerHTML = this.generateCustomerFooterHTML(reservation, companyDetails);

      // Add customer-specific data based on frontend CustomerVouchers component
      const customerSpecificData = {
        ...templateData,

        // Customer-specific notes and information
        customerNote: reservation.customerNote || 'N/A',

        // Booking information fields
        hotelName: reservation.hotels?.name || 'N/A',
        cityName: reservation.hotels?.city?.name || 'N/A',
        stateName: reservation.hotels?.state?.name || 'N/A',
        inputDate: TemplateHelper.formatDate(reservation.createdAt, 'long'),
        modifiedDate: reservation.updatedAt ? TemplateHelper.formatDate(reservation.updatedAt, 'long') : 'N/A',
        reservationId: reservation.bookingId || 'N/A',
        refNumber: reservation.pnr || 'N/A',
        bookingType: paymentType || 'N/A',
        checkInDate: TemplateHelper.formatDate(reservation.checkingDate, 'long'),
        checkOutDate: TemplateHelper.formatDate(reservation.checkoutDate, 'long'),
        totalNights: reservation.totalNight || 0,
        totalRooms: reservation.totalRooms || 0,
        totalAdults: reservation.totalAdults || 0,
        totalChildren: reservation.totalChildren || 0,
        totalInfants: totalInfants,

        // Customer information
        customerName: reservation.customers?.name || 'N/A',
        customerEmail: reservation.customers?.email || 'N/A',
        customerPhone: reservation.customers?.phone || reservation.customers?.mobile || 'N/A',

        // Room details
        roomDetailsHTML: roomDetailsHTML,

        // Financial calculations
        netAmount: netAmount.toFixed(2),
        gstAmount: gstAmt.toFixed(2),
        totalAmount: totalAmount.toFixed(2),

        // Direct payment section
        directPaymentHTML: directPaymentHTML,

        // GST information
        gstInformationHTML: gstInformationHTML,

        // Policy information
        policyHTML: policyHTML,

        // Footer information
        footerHTML: footerHTML,

        // Payment type for conditional rendering
        isDirectPayment: paymentType === 'Direct Payment',

        // Travel partner information for footer
        travelPartnerName: reservation.travelPartner?.partnerName || 'N/A',
        travelPartnerPhone: reservation.travelPartner?.mobile || 'N/A',
        travelPartnerContact: reservation.travelPartner?.contactDetails || 'N/A',

        // GST details from state
        gstNumber: reservation.hotels?.state?.gstDetails?.[0]?.gstNumber || 'N/A',
        stateCode: reservation.hotels?.state?.gstDetails?.[0]?.code || 'N/A',

        // Customer GST information (payload already merged with oldData when applicable)
        customerGstNumber: reservation.customers?.gstNumber || 'N/A',
        customerGstName: reservation.customers?.gstName || 'N/A',
        customerGstAddress: reservation.customers?.gstAddress || 'N/A'
      };

      const htmlContent = await TemplateHelper.loadAndProcessTemplate('customer-reservation', customerSpecificData);

      // Replace data-bg-color attribute with background-color in the existing style attribute
      const processedHtml = htmlContent.replace(
        /style="([^"]*)"[^>]*data-bg-color="([^"]*)"/g,
        (match, existingStyle, color) => {
          return `style="${existingStyle}; background-color: ${templateData?.titleColor}"`;
        }
      );

      return processedHtml;
    } catch (error) {
      console.error('Error generating customer email HTML:', error);
      throw error;
    }
  }

  /**
   * Generate room details HTML for customer view
   * @param {Array} bookingDetails - Array of booking details
   * @returns {string} HTML string
   */
  static generateCustomerRoomDetailsHTML(bookingDetails) {
    if (!bookingDetails || bookingDetails.length === 0) {
      return '<p>No room details available</p>';
    }

    let html = `
      <table border="1" width="100%" cellpadding="8" cellspacing="0" style="font-size: 12px; font-family: Arial, Helvetica, sans-serif; color: #444; border-collapse: collapse; border: 1px solid">
        <thead>
          <tr>
            <td colspan="8" style="padding: 8px">
              <h4 style="text-transform: uppercase; font-size: 12px; font-weight: bold; margin: 0px 5px; padding: 5px 0 5px; text-align: center; font-family: arial">
                Room Details BREAKUPS:
              </h4>
            </td>
          </tr>
          <tr>
            <th style="padding: 8px">SR. No</th>
            <th style="padding: 8px">Room Type</th>
            <th style="padding: 8px">Plan</th>
            <th style="padding: 8px">Adult</th>
            <th style="padding: 8px">Child</th>
            <th style="padding: 8px">Child Age</th>
            <th style="padding: 8px">Extra Bed</th>
          </tr>
        </thead>
        <tbody>
    `;

    bookingDetails.forEach((booking, index) => {
      html += `
        <tr>
          <td style="padding: 8px">${index + 1}</td>
          <td style="padding: 8px">${booking?.rooms?.roomName || 'N/A'}</td>
          <td style="padding: 8px">${booking.ratePlans?.name || 'N/A'}</td>
          <td style="padding: 8px">${booking.totalAdults || 0}</td>
          <td style="padding: 8px">${booking.totalChild || 0}</td>
          <td style="padding: 8px">${(booking?.childAge || []).toString()}</td>
          <td style="padding: 8px">${booking.extraBed || 0}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  /**
   * Generate direct payment section HTML
   * @param {Object} reservation - Reservation data
   * @param {number} netAmount - Net amount
   * @param {number} gstAmt - GST amount
   * @param {number} totalAmount - Total amount
   * @returns {string} HTML string
   */
  static generateDirectPaymentHTML(reservation, netAmount, gstAmt, totalAmount) {
    const advance = Number(reservation?.advance || 0);
    const balance = Number(reservation?.balance || 0);

    return `
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background: #ffffff; margin: 0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family: Arial, Helvetica, sans-serif; padding: 10px; text-align: left">
              <table border="1" bordercolor="#cccccc" width="100%" cellpadding="8" cellspacing="0" style="font-size: 13px; font-family: Arial, Helvetica, sans-serif; color: #444">
                <tbody>
                  <tr>
                    <td colspan="2" style="text-align: center; font-weight: bold; color: #000; vertical-align: top; font-family: arial">BREAKUP OF ROOMS & TAXES</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: top; font-family: arial">(A) Room Charges</td>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: center; font-family: arial">INR ${Number(reservation?.roomCharges).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: top; font-family: arial">(B) GST Amount</td>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: center; font-family: arial">INR ${Number(reservation?.hotelTaxes).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: top; font-family: arial">Total Amount (A+B)</td>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: center; font-family: arial">INR ${(Number(reservation?.roomCharges || 0) + Number(reservation?.hotelTaxes || 0)).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background: #ffffff; margin: 0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family: Arial, Helvetica, sans-serif; padding: 10px; text-align: left">
              <table border="1" bordercolor="#cccccc" width="100%" cellpadding="8" cellspacing="0" style="font-size: 13px; font-family: Arial, Helvetica, sans-serif; color: #444">
                <tbody>
                  <tr>
                    <td colspan="2" style="text-align: center; font-weight: bold; color: #000; vertical-align: top; font-family: arial; background-color: #f3ba0e">DIRECT PAYMENT COLLECTION - KINDLY MAKE PAYMENT ACCORDINGLY AT HOTEL PAYMENT COUNTER</td>
                  </tr>
                  <tr style="background-color: #df9d93">
                    <td width="50%" style="text-align: left; vertical-align: top; font-family: arial">TOTAL AMOUNT TO BE PAID</td>
                    <td width="50%" style="text-align: left; vertical-align: center; font-family: arial">INR ${(advance + balance).toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #f3ba0e">
                    <td width="50%" style="text-align: left; vertical-align: top; font-family: arial">ADVANCE PAID BY THE GUEST</td>
                    <td width="50%" style="text-align: left; vertical-align: center; font-family: arial">INR ${advance.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #93bcdf">
                    <td width="50%" style="text-align: left; vertical-align: top; font-family: arial">BALANCE TO BE PAID</td>
                    <td width="50%" style="text-align: left; vertical-align: center; font-family: arial">INR ${balance.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #f3ba0e">
                    <td width="50%" style="text-align: left; vertical-align: top; font-family: arial">BALANCE PAYMENT PROCESS</td>
                    <td width="50%" style="text-align: left; vertical-align: center; font-family: arial">Please pay INR ${balance.toFixed(2)} directly in the hotel at the time of check in.</td>
                  </tr>
                  <tr style="background-color: #d7e1e9">
                    <td width="50%" style="text-align: left; vertical-align: top; font-family: arial" rowspan="4">GST & APPLICABLE CHANGES</td>
                    <td width="50%" style="text-align: left; vertical-align: center; font-family: arial">The Payment is inclusive of GST and other applicable charges as mentioned above.</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Generate GST information HTML
   * @param {Object} reservation - Reservation data
   * @returns {string} HTML string
   */
  static generateGSTInformationHTML(reservation) {
    return `
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background: #ffffff; margin: 0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family: Arial, Helvetica, sans-serif; padding: 10px; text-align: left">
              <table border="1" bordercolor="#cccccc" width="100%" cellpadding="8" cellspacing="0" style="font-size: 13px; font-family: Arial, Helvetica, sans-serif; color: #444">
                <tbody>
                  <tr>
                    <td colspan="2" style="text-align: center; font-weight: bold; color: #000; vertical-align: top; font-family: arial">GUEST GST INFORMATION:</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: top; font-family: arial">GST Number</td>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: center; font-family: arial">${reservation?.customers?.gstNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: top; font-family: arial">GST Holders Name</td>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: center; font-family: arial">${reservation?.customers?.gstName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: top; font-family: arial">GST Address</td>
                    <td width="50%" style="text-align: left; color: #878787; vertical-align: center; font-family: arial">${reservation?.customers?.gstAddress || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Generate customer policy HTML
   * @param {Object} reservation - Reservation data
   * @returns {string} HTML string
   */
  static generateCustomerPolicyHTML(reservation) {
    const { generalPolicies } = reservation || {};

    return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" id="backgroundTable" style="background-color: #eaeaea">
        <tbody>
          <tr>
            <td>
              <table width="630" cellpadding="15" cellspacing="0" border="0" align="center" class="devicewidth" style="background-color: #ffffff; margin: 0 auto">
                <tbody>
                  <tr>
                    <td width="100%" style="padding: 15px">
                      <table width="100%" align="left" border="0" cellpadding="0" cellspacing="0">
                        <tbody>
                          <tr>
                            <td>
                              <h4 style="text-transform: uppercase; font-size: 12px; font-weight: bold; color: #878789; margin: 0px; padding: 5px 0 5px; text-align: left; font-family: arial">Policies :</h4>
                              <div style="margin-top: 14pt; margin-bottom: 14pt; font-size: 14px; text-align: left; color: #4F4F4F; font-family: arial">
                                ${generalPolicies}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Generate admin/hotel policy HTML based on cancellation policy
   * @param {Object} reservation - Reservation data
   * @returns {string} HTML string
   */
  static generateAdminHotelPolicyHTML(reservation) {
    const { cancellationPolicy, generalPolicies, corporatePolicies, bulkGroupPolicies } = reservation || {};

    let policyData;
    if (cancellationPolicy === "general") {
      policyData = generalPolicies;
    } else if (cancellationPolicy === "strict") {
      policyData = corporatePolicies;
    } else if (cancellationPolicy === "nonRefundable") {
      policyData = bulkGroupPolicies;
    }
    return policyData;
  }

  /**
   * Generate admin direct payment HTML section
   * @param {Object} reservation - Reservation data
   * @returns {string} HTML string
   */
  static generateAdminDirectPaymentHTML(reservation) {
    const roomCharges = Number(reservation?.roomCharges || 0).toFixed(2);
    const hotelTaxes = Number(reservation?.hotelTaxes || 0).toFixed(2);
    const otaCommission = Number(reservation?.otaCommission || 0).toFixed(2);
    const advance = Number(reservation?.advance || 0).toFixed(2);
    const balance = Number(reservation?.balance || 0).toFixed(2);
    const comments = reservation?.comments || 'N/A';

    return `
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background:#ffffff; margin:0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family:Arial, Helvetica, sans-serif; padding: 10px; text-align:left;">
              <table border="1" width="100%" cellpadding="8" cellspacing="0" style="font-size:13px; font-family:Arial, Helvetica, sans-serif; color: #444; border-color:#cccccc;">
                <tbody>
                  <tr>
                    <td colspan="2" style="text-align:center; font-weight:bold; color:#000; vertical-align:top; font-family:arial">COMMISSION BREAKUP : OTA</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:top; font-family:arial">Room Charges</td>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:center; font-family:arial">INR ${roomCharges}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:top; font-family:arial">Hotel Taxes</td>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:center; font-family:arial">INR ${hotelTaxes}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:top; font-family:arial">OTA Commission</td>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:center; font-family:arial">INR ${otaCommission}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background:#ffffff; margin:0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family:Arial, Helvetica, sans-serif; padding: 10px; text-align:left;">
              <table border="1" width="100%" cellpadding="8" cellspacing="0" style="font-size:13px; font-family:Arial, Helvetica, sans-serif; color: #444; border-color:#cccccc;">
                <tbody>
                  <tr>
                    <td colspan="2" style="text-align:center; font-weight:bold; color:#000; vertical-align:top; font-family:arial">ADVANCE PAYMENT COLLECTED:</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:top; font-family:arial">Advance Collected</td>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:center; font-family:arial">INR ${advance}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:top; font-family:arial">Balance - Hotel has to collect</td>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:center; font-family:arial">INR ${balance}</td>
                  </tr>
                  <tr>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:top; font-family:arial">Comments - Payment</td>
                    <td width="50%" style="text-align:left; color:#878787; vertical-align:center; font-family:arial">${comments}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Generate OTA Settlement HTML section (mirrors frontend OTASettlement.jsx)
   * Shows per-night, per-room breakdown of base rate and GST, plus OTA Payment Summary.
   *
   * @param {Object} reservation - Reservation data (with bookingDetails, checkingDate, hotels.commission)
   * @param {Object} companyDetails - Company details (gstPercentage*, gstOnCommissionByOTA, tcsDeductionByOTA, tdsDeductionByOTA)
   * @returns {string} HTML string (empty string if no rows)
   */
  static generateOTASettlementHTML(reservation, companyDetails) {
    const { bookingDetails, checkingDate } = reservation || {};
    const commission = reservation?.hotels?.commission;

    if (!bookingDetails || !checkingDate) return '';

    const { rows, grandTotalBaseRate, grandTotalGst } = fetchGstDetails(reservation, companyDetails);
    const {
      b2cCommissionPct,
      gstOnCommissionPct,
      tcsPct,
      tdsPct,
      otaCommissionAmt,
      gstOnCommissionAmt,
      tcsAmt,
      tdsAmt,
      totalDeduction,
      balanceAmount,
      finalPaid, } = paymentSummary(commission, companyDetails, grandTotalBaseRate, grandTotalGst);
    if (!rows.length) return '';

    const companyName = companyDetails?.companyName;

    // ── shared style snippets ─────────────────────────────────────────────────
    const cellStyle = 'padding:8px;font-size:12px;font-family:arial;color:#333';
    const cellLeft = `${cellStyle};text-align:left`;
    const cellRight = `${cellStyle};text-align:right`;
    const boldCellLeft = `${cellLeft};font-weight:bold;color:#000`;
    const boldCellRight = `${cellRight};font-weight:bold;color:#000`;

    // ── OTA Settlement rows HTML ──────────────────────────────────────────────
    const settlementRows = rows.map(row => `
      <tr style="background-color:#b4c6e7">
        <td style="${cellLeft}">${row.date}</td>
        <td style="${cellLeft}">${row.roomType}</td>
        <td style="${cellRight}">${row.baseRate.toFixed(2)}</td>
        <td style="${cellRight}">${row.gst.toFixed(2)}</td>
      </tr>`).join('');

    // ── Build combined HTML ───────────────────────────────────────────────────
    return `
      <!-- ========== OTA Settlement - Charged from Customer ========== -->
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background:#ffffff;margin:0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family:Arial,Helvetica,sans-serif;padding:10px;text-align:left">
              <table border="1" width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;font-family:Arial,Helvetica,sans-serif;color:#444;border-color:#cccccc;border-collapse:collapse;border:1px solid #cccccc">
                <thead>
                  <tr>
                    <th colspan="4" style="background-color:#ffffff;color:#000;text-align:center;font-weight:bold;font-size:14px;padding:10px 8px;font-family:arial;border-bottom:2px solid #cccccc">
                      OTA Settlement - Charged from Customer
                    </th>
                  </tr>
                  <tr style="background-color:#93c47d">
                    <th style="padding:8px;text-align:left;font-weight:bold;font-size:12px;font-family:arial;border-bottom:2px solid #999">Date</th>
                    <th style="padding:8px;text-align:left;font-weight:bold;font-size:12px;font-family:arial;border-bottom:2px solid #999">Room Type</th>
                    <th style="padding:8px;text-align:right;font-weight:bold;font-size:12px;font-family:arial;border-bottom:2px solid #999">Base Rate</th>
                    <th style="padding:8px;text-align:right;font-weight:bold;font-size:12px;font-family:arial;border-bottom:2px solid #999">GST</th>
                  </tr>
                </thead>
                <tbody>
                  ${settlementRows}
                </tbody>
                <tfoot>
                  <tr style="background-color:#ffd966">
                    <td colspan="2" style="${boldCellLeft};text-align:center;padding:10px 8px;font-size:13px">Grand Total</td>
                    <td style="${boldCellRight};padding:10px 8px;font-size:13px">${grandTotalBaseRate.toFixed(2)}</td>
                    <td style="${boldCellRight};padding:10px 8px;font-size:13px">${grandTotalGst.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ========== OTA Payment Summary ========== -->
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background:#ffffff;margin:0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family:Arial,Helvetica,sans-serif;padding:10px;text-align:left">
              <table border="1" width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;font-family:Arial,Helvetica,sans-serif;color:#444;border-color:#cccccc;border-collapse:collapse;border:1px solid #cccccc">
                <thead>
                  <tr>
                    <th colspan="3" style="background-color:#ffffff;color:#000;text-align:center;font-weight:bold;font-size:14px;padding:10px 8px;font-family:arial;border-bottom:2px solid #cccccc">
                      OTA Payment Summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background-color:#fff2cc">
                    <td style="${boldCellLeft};padding:8px 8px">OTA Commission (${b2cCommissionPct}%) On</td>
                    <td style="${cellRight};padding:8px">${grandTotalBaseRate.toFixed(2)}</td>
                    <td style="${boldCellRight};padding:8px">${otaCommissionAmt.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color:#fff2cc">
                    <td style="${boldCellLeft};padding:8px 8px">${gstOnCommissionPct}% GST on Commission</td>
                    <td style="${cellRight};padding:8px">${otaCommissionAmt.toFixed(2)}</td>
                    <td style="${boldCellRight};padding:8px">${gstOnCommissionAmt.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color:#fff2cc">
                    <td style="${boldCellLeft};padding:8px 8px">TCS ${tcsPct}% on</td>
                    <td style="${cellRight};padding:8px">${grandTotalBaseRate.toFixed(2)}</td>
                    <td style="${boldCellRight};padding:8px">${tcsAmt.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color:#fff2cc">
                    <td style="${boldCellLeft};padding:8px 8px">TDS ${tdsPct}% on</td>
                    <td style="${cellRight};padding:8px">${grandTotalBaseRate.toFixed(2)}</td>
                    <td style="${boldCellRight};padding:8px">${tdsAmt.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color:#ffd966">
                    <td style="${boldCellLeft};padding:8px 8px;text-align:center">Total Deduction by OTAs</td>
                    <td colspan="2" style="${boldCellRight};padding:8px;text-align:center;font-size:13px">${totalDeduction.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color:#93c47d">
                    <td style="${boldCellLeft};padding:8px 8px">&nbsp;</td>
                    <td style="${boldCellRight};text-align:center;padding:8px;font-size:12px">Balance Amount</td>
                    <td style="${boldCellRight};text-align:center;padding:8px;font-size:12px">and GST</td>
                  </tr>
                  <tr style="background-color:#f4cccc">
                    <td style="${boldCellLeft};padding:8px 8px;font-size:13px">Final Paid to us</td>
                    <td style="${boldCellRight};padding:8px;font-size:13px">${balanceAmount.toFixed(2)}</td>
                    <td style="${boldCellRight};padding:8px;font-size:13px">${grandTotalGst.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color:#f4cccc">
                    <td style="${boldCellLeft};padding:8px 8px">&nbsp;</td>
                    <td colspan="2" style="${boldCellRight};text-align:center;padding:10px 8px;font-size:14px">${finalPaid.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ========== Note / Disclaimer ========== -->
      <table width="630" cellpadding="0" cellspacing="0" border="0" align="center" class="devicewidth" style="background:#ffffff;margin:0 auto">
        <tbody>
          <tr>
            <td width="90%" style="font-family:Arial,Helvetica,sans-serif;padding:10px;text-align:left">
              <table border="1" width="100%" cellpadding="8" cellspacing="0" style="font-size:12px;font-family:Arial,Helvetica,sans-serif;color:#444;border-color:#cccccc;border-collapse:collapse;border:1px solid #cccccc">
                <tbody>
                  <tr>
                    <td style="padding:10px;font-size:11px;font-family:arial;color:#333;line-height:1.5;text-align:justify">
                      ${companyName} acts only as an intermediary facilitating bookings between the guest and the hotel. The hotel is the actual supplier of accommodation services and is solely responsible for providing the services and issuing the GST tax invoice to the guest. Input Tax Credit (ITC), if applicable, can be claimed only on the GST invoice issued by the respective hotel. ${companyName} does not provide accommodation services directly.
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Generate customer footer HTML
   * @param {Object} reservation - Reservation data
   * @param {Object} companyDetails - Company details object
   * @returns {string} HTML string
   */
  static generateCustomerFooterHTML(reservation, companyDetails) {
    const { hotels } = reservation || {};
    const { state } = hotels || {};
    const gstNumber = state?.gstDetails?.[0]?.gstNumber || 'N/A';
    const stateCode = state?.gstDetails?.[0]?.code || 'N/A';
    const panNumber = companyDetails?.panNo || 'N/A';
    const companyRegNumber = companyDetails?.companyRegistrationNo || 'N/A';

    return `
      <table width="100%" bgcolor="#eaeaea" cellpadding="0" border="0" id="backgroundTable">
        <tbody>
          <tr>
            <td>
              <table width="630" cellpadding="0" cellspacing="0" valign="top" border="0" align="center" class="devicewidth" style="margin: 0 auto 10px">
                <tbody>
                  <tr>
                    <td width="100%" bgcolor="#ffffff" style="border-top: #cccccc 1px dashed; border-bottom-left-radius: 7px; border-bottom-right-radius: 7px; padding: 10px 15px">
                      <table width="630" align="center" cellpadding="0" cellspacing="0" style="text-align: center; width: 100% !important">
                        <tbody>
                          <tr>
                            <td align="center" style="color: #484646; font-size: 14px; margin-top: 0px; font-family: Arial, Helvetica, sans-serif; padding-top: 5px; padding-bottom: 10px; font-weight: bold">
                              Customer support: If you have any questions, please contact the World Choice Hotels Support Center Name: ${reservation?.travelPartner?.partnerName || 'N/A'}, Phone: ${reservation?.travelPartner?.mobile || 'N/A'}, ${reservation?.travelPartner?.contactDetails || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="color: #484646; font-size: 14px; margin-top: 0px; font-family: Arial, Helvetica, sans-serif; padding-top: 5px; padding-bottom: 10px">
                              GSTIN: ${gstNumber}, State Code: ${stateCode}, Pan No.: ${panNumber} <br />Company Reg. No. : ${companyRegNumber}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Send reservation confirmation email to hotel
   * @param {Object} reservation - Complete reservation data with relations
   * @returns {Promise<Object>}
   */
  static async sendReservationEmailToHotel(reservation, type) {
    try {
      const hotel = reservation.hotels;
      if (!hotel || !hotel.email) {
        throw new Error('Hotel email not found');
      }

      const hotelEmails = Array.isArray(hotel.email) ? hotel.email : [hotel.email];
      const htmlContent = await this.generateHotelEmailHTML(reservation);

      const emailResult = await EmailService.sendEmail({
        from: emailConfig?.reservation,
        cc: emailConfig?.reservationCC,
        to: hotelEmails,
        subject: `${type} Reservation - Hotel - ${reservation.bookingId} - ${hotel?.name}, ${hotel?.city?.name}, ${hotel?.state?.name}, ${TemplateHelper.formatDate(new Date(), 'DDMMYYYY')}`,
        html: htmlContent
      });

      return emailResult;
    } catch (error) {
      console.error('Error sending reservation email to hotel:', error);
      throw error;
    }
  }

  /**
   * Send reservation confirmation email to customer
   * @param {Object} reservation - Complete reservation data with relations
   * @returns {Promise<Object>}
   */
  static async sendReservationEmailToCustomer(reservation, type) {
    try {
      const customer = reservation.customers;
      if (!customer || !customer.email) {
        throw new Error('Customer email not found');
      }

      const customerEmails = Array.isArray(customer.email) ? customer.email : [customer.email];
      const htmlContent = await this.generateCustomerEmailHTML(reservation);

      const emailResult = await EmailService.sendEmail({
        from: emailConfig?.reservation,
        cc: emailConfig?.reservationCC,
        to: customerEmails,
        subject: `${type} Reservation - Guest - ${reservation.bookingId} - ${reservation?.hotels?.name}, ${reservation?.hotels?.city?.name}, ${reservation?.hotels?.state?.name}, ${TemplateHelper.formatDate(new Date(), 'DDMMYYYY')}`,
        html: htmlContent
      });

      console.log(`Reservation email sent to customer: ${customer.name} (${customerEmails.join(', ')})`);
      return emailResult;
    } catch (error) {
      console.error('Error sending reservation email to customer:', error);
      throw error;
    }
  }

  /**
   * Send reservation confirmation email to admin
   * @param {Object} reservation - Complete reservation data with relations
   * @returns {Promise<Object>}
   */
  static async sendReservationEmailToAdmin(reservation, type) {
    try {
      const htmlContent = await this.generateAdminEmailHTML(reservation);

      const emailResult = await EmailService.sendEmail({
        from: emailConfig?.reservation,
        to: emailConfig?.adminEmail,
        subject: `${type} Reservation - Admin - ${reservation.bookingId} - ${reservation?.hotels?.name}, ${reservation?.hotels?.city?.name}, ${reservation?.hotels?.state?.name}, ${TemplateHelper.formatDate(new Date(), 'DDMMYYYY')}`,
        html: htmlContent
      });

      return emailResult;
    } catch (error) {
      console.error('Error sending reservation email to admin:', error);
      throw error;
    }
  }

  /**
   * Send reservation confirmation emails to all parties
   * @param {Object} reservation - Complete reservation data with relations
   * @returns {Promise<Object>}
   */
  static async sendReservationEmails(reservationDetails, type = "New") {
    try {

      const reservation = reservationDetails?.toJson ? reservationDetails?.toJson() : reservationDetails;

      // Ensure templates receive complete relations using oldData fallback
      const payload = this.buildEmailPayload(reservation);

      const results = {
        hotel: null,
        customer: null,
        admin: null,
        errors: []
      };

      // // Send to hotel
      try {
        results.hotel = await this.sendReservationEmailToHotel(payload, type);
      } catch (error) {
        results.errors.push(`Hotel email failed: ${error.message}`);
      }

      // Send to customer
      try {
        results.customer = await this.sendReservationEmailToCustomer(payload, type);
      } catch (error) {
        results.errors.push(`Customer email failed: ${error.message}`);
      }

      // // Send to admin
      try {
        results.admin = await this.sendReservationEmailToAdmin(payload, type);
      } catch (error) {
        results.errors.push(`Admin email failed: ${error.message}`);
      }

      return results;
    } catch (error) {
      console.error('Error sending reservation emails:', error);
      throw error;
    }
  }
}

module.exports = ReservationEmailService; 