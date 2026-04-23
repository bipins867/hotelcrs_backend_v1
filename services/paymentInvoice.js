const EmailService = require('./EmailService');
const emailConfig = require('../config/email');
const { numberToWords } = require('../utils/helper');

class PaymentInvoice extends EmailService {
  static async sendPaymentInvoiceToCustomer(payment, customerEmail) {
    try {
      const subject = `Payment Receipt - Booking ${payment.reservation.bookingId}`;
      const html = this.generatePaymentInvoiceHTML(payment, 'customer');

      return await EmailService.sendEmail({
        to: customerEmail,
        subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send payment invoice to customer: ${error.message}`);
    }
  }

  static async sendPaymentInvoiceToHotel(payment, hotelEmail) {
    try {
      const subject = `Payment Notification - Booking ${payment.reservation.bookingId}`;
      const html = this.generatePaymentInvoiceHTML(payment, 'hotel');
      
    return await EmailService.sendEmail({
        to: hotelEmail,
        subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send payment invoice to hotel: ${error.message}`);
    }
  }

  static generatePaymentInvoiceHTML(payment, recipientType) {
    const reservation = payment.reservation;
    const customer = reservation.customers;
    const hotel = reservation.hotels;
    
    // Handle email and mobile fields that might be JSON/JSONB arrays
    const getCustomerEmail = () => {
      if (!customer?.email) return null;
      if (Array.isArray(customer.email)) {
        return customer.email[0] || null;
      }
      return customer.email;
    };

    const getCustomerMobile = () => {
      if (!customer?.mobile) return null;
      if (Array.isArray(customer.mobile)) {
        return customer.mobile[0] || null;
      }
      return customer.mobile;
    };

    const getHotelEmail = () => {
      if (!hotel?.email) return null;
      if (Array.isArray(hotel.email)) {
        return hotel.email[0] || null;
      }
      return hotel.email;
    };

    const getHotelPhone = () => {
      if (!hotel?.phone) return null;
      if (Array.isArray(hotel.phone)) {
        return hotel.phone[0] || null;
      }
      return hotel.phone;
    };
    
    const paymentDate = new Date(payment.paymentDate);
    const currentDate = new Date();
    
    // Format dates for display
    const formatDate = (date) => {
      const day = date.getDate();
      const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0)];
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day}${suffix} ${month}, ${year}`;
    };

    // Calculate GST (assuming 6% each for SGST and CGST)
    const roomRent = reservation.netAmt || 0;
    const sgst = Math.round(roomRent * 0.06);
    const cgst = Math.round(roomRent * 0.06);
    const grandTotal = Number(roomRent) + Number(sgst) + Number(cgst);

    const amountInWords = numberToWords(grandTotal) + ' Rupees Only';

    return `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="language" content="en">
        <title>Booking Application - Invoice Payment</title>
      </head>
      <body>
        <div class="container" id="page">
          <table cellpadding="0" cellspacing="0" border="0" align="center">
            <tbody>
              <tr>
                <td>
                  <div style="font-family: Calibri;">
                    <div align="left">
                      <table width="650" cellspacing="0" cellpadding="0" border="0">
                        <tbody>
                          <tr>
                            <td align="center">
                              <u>
                                <h1 style="font-family: arial , sans-serif;font-size: 14.0pt;clear: both;">Tax Invoice</h1>
                              </u>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <img style="outline: none;border: none;" alt="${emailConfig.companyName}" src="${emailConfig.companyLogo || ''}">
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <p style="font-size: 14px;">
                                <b>Address: ${emailConfig.companyAddress} <br>
                                ${emailConfig.companyPhone} <br>
                                ${emailConfig.companyEmail}</b>
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <table width="650" style="color: rgb(0,0,0);font-size: 14px;border: 1.0px solid rgb(89,87,88);" cellspacing="0" cellpadding="10">
                        <tbody>
                          <tr>
                            <td rowspan="5" style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">
                              To,<br>
                              ${customer?.name || 'N/A'}<br>
                              <b>Mobile:</b> ${getCustomerMobile() || 'N/A'}<br>
                              <b>Email:</b> ${getCustomerEmail() || 'N/A'}<br>
                              <b>GST Number:</b> ${customer?.gstNumber || ''}<br>
                              <b>GST Holder Name:</b> ${customer?.gstHolderName || ''}<br>
                              <b>GST Holder Address:</b> ${customer?.gstHolderAddress || ''}
                            </td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">
                              GSTIN : ${emailConfig.gstin || 'N/A'}<br>
                              Pan No. : ${emailConfig.panNumber || 'N/A'} <br>
                              HSN/SAC Code : ${emailConfig.hsnCode || '996311'} <br>
                              Company Reg. No. : ${emailConfig.companyRegNumber || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">
                              Invoice No: ${payment.id}
                            </td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">
                              Date: ${formatDate(currentDate)}
                            </td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">
                              Reference No.: ${reservation.bookingId}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <table width="650">
                        <tbody>
                          <tr>
                            <td align="center">
                              <h1 style="font-family: arial , sans-serif;font-size: 14.0pt;clear: both;">Description</h1>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <table width="650" style="color: rgb(0,0,0);font-size: 14px;border: 1.0px solid rgb(89,87,88);" cellspacing="0" cellpadding="10">
                        <tbody>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88); font-weight: bold;">Hotel Name:</td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">${hotel?.name || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88); font-weight: bold;">Hotel Address:</td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">${hotel?.address || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88); font-weight: bold;">Check In Date:</td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">${formatDate(new Date(reservation.checkingDate))}</td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88); font-weight: bold;">Check Out Date:</td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">${formatDate(new Date(reservation.checkoutDate))}</td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <br>
                      
                      <table width="650" style="color: rgb(0,0,0);font-size: 14px;border: 1.0px solid rgb(89,87,88);" cellspacing="0" cellpadding="10">
                        <tbody>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);"><b>Room Rent</b></td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);"><b>${roomRent.toLocaleString()}</b></td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);text-indent: 15.0pt;">SGST (6%)</td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">${sgst}</td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);text-indent: 15.0pt;">CGST (6%)</td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);">${cgst}</td>
                          </tr>
                          <tr>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);"><b>Grand Total</b></td>
                            <td style="width: 50.0%;border-bottom: 1.0px solid rgb(89,87,88);"><b>Rs. ${grandTotal.toLocaleString()}</b></td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <br>
                      
                      <table width="575" style="font-size: 14px;clear: both;" cellspacing="0" cellpadding="0">
                        <tbody>
                          <tr>
                            <td style="width: 50.0%;border:0;">
                              <u><b>Amount in words</b></u><br>${amountInWords}<br><br><br>
                              <b>${emailConfig.bankName || 'Bank'} - Account Details:</b><br>
                              Beneficiary Name : ${emailConfig.beneficiaryName || emailConfig.companyName}<br>
                              A/C No : ${emailConfig.accountNumber || 'N/A'}<br>
                              IFS Code : ${emailConfig.ifscCode || 'N/A'}<br>
                              Swift Code : ${emailConfig.swiftCode || 'N/A'}<br>
                              Bank Name : ${emailConfig.bankName || 'N/A'}<br>
                              Branch : ${emailConfig.bankBranch || 'N/A'}<br><br>
                              
                              <br>For ${emailConfig.companyName}.<br>
                              <img src="${emailConfig.signatureImage || ''}"><br>
                              Authorized Signatory
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <br><br>
                              This is an electronically generated Invoice, hence no signature is required.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = PaymentInvoice;