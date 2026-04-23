const EmailService = require('./EmailService');
const TemplateHelper = require('../utils/templateHelper');
const WhatsAppDataService = require('./whatsapp/dataService');
const { formatTime } = require('../utils/common');
const { emailConfig } = require('../config/email');

class InquiryEmailService {

  static addTwentyPercent(amount) {
    return Number(amount) + (Number(amount) * 20) / 100;
  }
  /**
   * Build payload using same data source as WhatsApp flow
   */
  static async buildTemplateData(hotelId, inquiry) {
    const data = await WhatsAppDataService.fetchHotelData(hotelId, inquiry);

    // Helper to generate simple 3-col rows for transport dicts which might not match exact schema
    // Assuming schema based on variable names

    // Room Rates Table
    const detailed = data.roomRatesDetailed || {};
    const roomRows = [];
    Object.keys(detailed).forEach((roomType) => {
      (detailed[roomType] || []).forEach((plan) => {
        roomRows.push(
          `<tr>` +
          `<td>${roomType}</td>` +
          `<td>${plan.ratePlanName}</td>` +
          `<td>${plan.sgl != null ? '₹' + this.addTwentyPercent(plan.sgl) : '-'}</td>` +
          `<td>${plan.dbl != null ? '₹' + this.addTwentyPercent(plan.dbl) : '-'}</td>` +
          `<td>${plan.extraAdult != null ? '₹' + this.addTwentyPercent(plan.extraAdult) : '-'}</td>` +
          `<td>${plan.extraChild != null ? '₹' + this.addTwentyPercent(plan.extraChild) : '-'}</td>` +
          `<td>${(plan.inclusions || []).join(', ')}</td>` +
          `</tr>`
        );
      });
    });
    const roomTable = roomRows.length
      ? roomRows.join('')
      : '<tr><td colspan="7">Contact hotel for detailed room categories and rates.</td>';

    // Restaurant Rows
    const restRows = [];
    const rd = Array.isArray(data.resturantDetails) ? data.resturantDetails : [];
    rd.forEach((r) => {
      restRows.push(`<tr><td>${r.resturantName}</td><td>${formatTime(r.openTime)}</td><td>${formatTime(r.closeTime)}</td></tr>`);
    });
    const restaurantRowsHtml = restRows.length ? restRows.join('') : '<tr><td colspan="3">Contact hotel for restaurant timings</td></tr>';

    // Transport Rows
    // data.transportCabDetails (facility/outlet, distance, time)
    // Structure assumed: { pickupPointDetails: "Station", distance: "10", timeTaken: "30" }
    const transportRows = (Array.isArray(data.transportCabDetails) ? data.transportCabDetails : []).map(t =>
      `<tr><td>${t.pickupPointDetails || ''}</td><td>${t.distance ? t.distance + ' km' : ''}</td><td>${t.timeTaken ? t.timeTaken + ' mins' : ''}</td></tr>`
    ).join('');

    // Pickup Rows
    // data.pickupPointDetails (Pickup Point Name, Car Type, Amount)
    // Structure assumed: { name: "Airport", carType: "Sedan", amount: "500" }
    const pickupRows = (Array.isArray(data.pickupPointDetails) ? data.pickupPointDetails : []).map(p =>
      `<tr><td>${p.pickupPointName || ''}</td><td>${p.carType || ''}</td><td>₹${p.amount || ''}</td></tr>`
    ).join('');

    // Hourly Rows
    // data.hourlyCharge (Hours Type, Car Type, Amount)
    const hourlyRows = (Array.isArray(data.hourlyCharge) ? data.hourlyCharge : []).map(h =>
      `<tr><td>${h.type || ''}</td><td>${h.carType || ''}</td><td>₹${h.amount || ''}</td></tr>`
    ).join('');

    // Outstation Rows
    // data.outStationCharge (Name, Car Type, Amount)
    const outstationRows = (Array.isArray(data.outStationCharge) ? data.outStationCharge : []).map(o =>
      `<tr><td>${o.type || ''}</td><td>${o.carType || ''}</td><td>₹${o.amount || ''}</td></tr>`
    ).join('');

    // Extra KM Rows
    // data.extraKmCharge (Type, Car Type, Amount)
    const extraKmRows = (Array.isArray(data.extraKmCharge) ? data.extraKmCharge : []).map(e =>
      `<tr><td>${e.type || ''}</td><td>${e.carType || ''}</td><td>₹${e.amount || ''}</td></tr>`
    ).join('');

    const documentsAccepted = data.documentsAccepted || '';
    const documentsAcceptedRows = documentsAccepted.split(',').map(doc => `<li class="small">${doc.trim()}</li>`).join('');

    const qrCodeRows = data.qrCodeArray?.filter(qrCode => qrCode)?.map(qrCode => `<img src="${qrCode}" alt="QR Code" class="qr-code"/>`).join('');

    return {
      Inquiry_Code: inquiry.inquiryCode || '',
      Guest_Name: inquiry.guestName,
      Hotel_Name: data.hotelName,
      Hotel_Address: data.hotelAddress || '',
      City: data.city || '',
      State: data.state || '',
      Country: data.country || '',
      Google_Maps: data.googleMaps || '',

      // Hotel Contact
      Restaurant_Number: data.restaurantContact || '',
      Restaurant_Email: data.restaurantEmail || '',
      hotelPhone: data.restaurantContact || '', // Duplicate for footer
      hotelEmail: data.restaurantEmail || '', // Duplicate for footer

      // Dates & Nights
      CheckIn_Date: data.checkInDate || '',
      CheckOut_Date: data.checkOutDate || '',
      No_Of_Nights: String(data.noOfNights || ''),
      Adults: String(data.adult || ''),
      Children: String(data.children || ''),
      No_Of_Rooms: String(data.numberOfRooms || ''),

      // Times
      CheckIn_Time: data.checkInTime ? formatTime(data.checkInTime) : '',
      CheckOut_Time: data.checkOutTime ? formatTime(data.checkOutTime) : '',
      Last_CheckIn_Time: data.lastCheckInTime ? formatTime(data.lastCheckInTime) : '', // Fixed Name
      Last_CheckOut_Allowed: data.lastCheckOutTime ? formatTime(data.lastCheckOutTime) : '',

      // Policies - Basic
      CheckIn_Age: data.checkInAge || '',
      Early_CheckIn_Option: data.earlyCheckInOption || '',
      Early_CheckIn_Charge: data.earlyCheckInCharge || '',
      Late_CheckOut_Option: data.lateCheckOutOption || '',
      Late_CheckOut_Charge: data.lateCheckOutCharge || '',

      // Child Policy
      Child_Age_Free: data.childAgeFree || '',
      Child_Age_Chargeable: data.childAgeChargeable || '',
      Child_Charge: data.childCharge || '',
      Extra_Person_Charge: data.extraPersonCharge || '',

      // Docs & Rules
      Documents_Accepted: documentsAcceptedRows,
      Visitor_Policy: data.visitorPolicy || '',
      Outside_Food: data.outsideFoodPolicy || '', // Fixed Name
      Pet_Policy: data.petPolicy || '',
      Local_Guest_Policy: data.localGuestPolicy || '',
      Unmarried_Couple_Policy: data.unmarriedCouplePolicy || '', // Fixed Name

      // Rate Tables & Totals
      Room_Types_Rates_HTML: roomTable,
      Room_Categories: data.roomCategories || '',
      Estimated_Total: data.estimatedTotal || '',

      // Restaurant
      Restaurant_Rows_HTML: restaurantRowsHtml,
      Breakfast_Cost: data?.breakfastCost || '',
      Lunch_Veg: data?.lunchVeg || '',
      Lunch_NonVeg: data?.lunchNonVeg || '',
      Dinner_Veg: data?.dinnerVeg || '',
      Dinner_NonVeg: data?.dinnerNonVeg || '',
      Menu_Type: data.menuType || '',
      Breakfast_Type: data.breakfastType || '',
      Breakfast_Served_In: data.breakfastServedIn || '',

      // Transport & Driver Tables
      Cab_Availability: data.cabAvailability || '',
      Transport_Table_Rows_HTML: transportRows,
      Pickup_Table_Rows_HTML: pickupRows,
      Hourly_Table_Rows_HTML: hourlyRows,
      Outstation_Table_Rows_HTML: outstationRows,
      Extra_KM_Table_Rows_HTML: extraKmRows,

      // Driver Details
      Driver_Allowance: data.driverDetails?.allowance || '',
      Toll_Tax_Paid_By: data.driverDetails?.tollTaxes || '',
      Driver_Accommodation_Charge: data.driverDetails?.accommodationCharge || '',
      Driver_Accommodation_Paid_By: data.driverDetails?.accommodationPaidBy || '',

      // Terms HTML (Terms are likely plain text/HTML in DB)
      Hill_Terms_HTML: data.terms?.hillStationTerms || '',
      Plain_Terms_HTML: data.terms?.plainAreaTerms || '',
      Extra_KM_Terms_HTML: data.terms?.extraKmTerms || '',
      Driver_Accommodation_Terms_HTML: data.terms?.driverAccommodationTerms || '',
      Unforeseen_Charges_HTML: data.terms?.unforeseenTerms || '',
      Payment_Terms_HTML: data.terms?.paymentTerms || '',

      // Payment
      Payment_Link_1: data.paymentLink1 || '',
      Payment_Link_2: data.paymentLink2 || '', // Assuming potential second link
      PayPal_Link_1: data.paypalPaymentLink1 || '',
      PayPal_Link_2: data.paypalPaymentLink2 || '', // Placeholder
      UPI_QR_Codes_HTML: qrCodeRows || '',

      // Footer / Other from original
      companyName: emailConfig?.companyName,
      companyPhone: emailConfig?.companyPhone,
      companyEmail: emailConfig?.companyEmail,
      companyWebsite: emailConfig?.companyWebsite,
    };
  }

  static async generateHTML(hotelId, inquiry) {
    const placeholders = await this.buildTemplateData(hotelId, inquiry);
    return TemplateHelper.loadAndProcessTemplate('inquiry_tentative_offer', placeholders);
  }

  static async sendInquiryEmail(hotelId, inquiry, toEmail) {
    const placeholders = await this.buildTemplateData(hotelId, inquiry);
    const html = await TemplateHelper.loadAndProcessTemplate('inquiry_tentative_offer', placeholders);
    const subject = `Hotel Reservation Inquiry ID: ${inquiry.inquiryCode || ''}, ${placeholders.Hotel_Name}, ${placeholders.City}, ${placeholders.State} ${TemplateHelper.formatDate(new Date(), 'DDMMYYYY')}`;
    return EmailService.sendEmail({
      to: toEmail,
      subject,
      html: html
    });
  }
}

module.exports = InquiryEmailService;


