const { Op } = require('sequelize');
const { Payment, Reservation, Customer, Hotel, State, City, Country, BookingDetail, Room, RatePlan, FinancialInformation } = require('../../db/models');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { buildWhereClause } = require('../../helper/filter');
const PaymentInvoice = require('../../services/paymentInvoice');
const HotelPaymentReceiptService = require('../../services/HotelPaymentReceiptService');
const PaymentReceiptEmailService = require('../../services/PaymentReceiptEmailService');
const { fetchAssignHotelId } = require('../common/helper');

let resourceName = 'Payment';

// Generate invoice number: P + dd + mm + yy + R + 6-digit sequence per day
const generateInvoiceNumber = async (index) => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = (now.getFullYear() % 100).toString().padStart(2, '0');
  const prefix = `P${day}${month}${year}R`;

  // Get the latest payment ID to generate next sequence
  const latestPayment = await Payment.findOne({
    order: [['id', 'DESC']],
    attributes: ['id']
  });

  const latestId = latestPayment ? latestPayment.id : 0;
  const nextSeq = (latestId + index + 1).toString().padStart(6, '0');
  return `${prefix}${nextSeq}`;
};

exports.findAndCountAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, orderBy = 'DESC',
      hotelName, stateId, cityId, countryId, bookingId, gstNumber
    } = req.query;
    const offset = (page - 1) * limit;

    const filterConfig = {
      reservationId: 'exact',
      paymentDate: 'exact',
      type: 'exact',
      modeOfPayment: 'exact',
      amount: 'exact',
      bankReference: 'exact',
      remark: 'exact',
      adjustmentBooking: 'exact',
      adjustmentAmount: 'exact',
      receipt: 'exact',
      isCancel: 'exact',
      email: 'json',
      mobile: 'json',
    };

    const assignHotelId = fetchAssignHotelId(req?.user);

    const where = buildWhereClause(req.query, filterConfig);

    const hotelFilter = {};
    if (hotelName) hotelFilter['$reservation.hotels.name$'] = { [Op.iLike]: `%${hotelName}%` };
    if (stateId) hotelFilter['$reservation.hotels.stateId$'] = { [Op.iLike]: `%${stateId}%` };
    if (cityId) hotelFilter['$reservation.hotels.cityId$'] = { [Op.iLike]: `%${cityId}%` };
    if (countryId) hotelFilter['$reservation.hotels.countryId$'] = { [Op.iLike]: `%${countryId}%` };

    if (assignHotelId) {
      hotelFilter['$reservation.hotels.id$'] = { [Op.in]: assignHotelId };
    }

    const reservationFilter = {};
    if (bookingId) reservationFilter.bookingId = { [Op.iLike]: `%${bookingId}%` };

    const { rows: payments, count: totalRecords } = await Payment.findAndCountAll({
      where: {
        ...where,
        ...hotelFilter,
      },
      offset: +offset,
      limit: +limit,
      include: [
        {
          model: Reservation, as: 'reservation', include: [
            { model: Customer, as: 'customers' },
            {
              model: Hotel, as: 'hotels', include: [
                { model: State, as: 'state' },
                { model: City, as: 'city' },
                { model: Country, as: 'country' },
                {
                  model: FinancialInformation, as: 'financialInformation', ...(gstNumber ? {
                    where: {
                      gstNumber: {
                        [Op.iLike]: `%${gstNumber}%`,
                      },
                    }
                  } : {})
                }
              ]
            },
          ],
          where: {
            ...reservationFilter,
          }
        },
      ],
      order: [['createdAt', orderBy]]
    });

    const totalPages = Math.ceil(totalRecords / limit);
    successResponse(res, `${resourceName} fetched successfully`, {
      payments,
      totalRecords,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const assignHotelId = fetchAssignHotelId(req?.user);

    const where = {};
    if (assignHotelId) {
      where['$reservation.hotels.id$'] = { [Op.in]: assignHotelId };
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Reservation,
          as: 'reservation',
          include: [
            {
              model: Customer,
              as: 'customer'
            }
          ]
        }
      ]
    });
    successResponse(res, `${resourceName}s fetched successfully`, payments);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}s`, error.message);
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Reservation,
          as: 'reservation',
          include: [
            {
              model: BookingDetail, as: 'bookingDetails', include: [
                { model: Room, as: 'rooms' },
                { model: RatePlan, as: 'ratePlans' }
              ]
            },
            { model: Customer, as: 'customers' },
            {
              model: Hotel, as: 'hotels', include: [
                { model: State, as: 'state' },
                { model: City, as: 'city' },
                { model: Country, as: 'country' },
                { model: FinancialInformation, as: 'financialInformation' }
              ]
            }
          ]
        }
      ]
    });
    if (!payment) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }
    successResponse(res, `${resourceName} fetched successfully`, payment);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.createPayment = async (req, res) => {
  try {
    const { payments } = req.body;
    const createdBy = req.user?.id || null;

    const bookingIds = payments.map(p => p.bookingId);

    // Fetch all reservations in one query
    const reservations = await Reservation.findAll({
      where: { bookingId: bookingIds }
    });

    const reservationMap = new Map(reservations.map(r => [r.bookingId, r]));

    // Validate & prepare payment data
    const paymentData = [];
    for (const payment of payments) {
      const reservationRecord = reservationMap.get(payment.bookingId);
      if (!reservationRecord) {
        return errorResponse(
          res,
          `${payment.bookingId} Booking not found`,
          null,
          400
        );
      }

      paymentData.push({
        ...payment,
        reservationId: reservationRecord.id,
        createdBy
      });
    }

    // Bulk create payments
    // Assign invoice numbers
    const preparedWithInvoice = await Promise.all(paymentData.map(async (p, index) => ({
      ...p,
      invoiceNumber: await generateInvoiceNumber(index)
    })));

    const createdPayments = await Payment.bulkCreate(preparedWithInvoice, {
      userId: createdBy,
      req
    });

    // Respond immediately without waiting for emails
    successResponse(res, `${resourceName} created successfully`, {
      payments: createdPayments
    });

    // ---- Fire email sending in background (no await) ----
    process.nextTick(async () => {
      const paymentAssociations = {
        include: [
          {
            model: Reservation,
            as: 'reservation'
          }
        ]
      };

      for (const payment of createdPayments) {
        try {
          const paymentWithAssociations = await Payment.findByPk(
            payment.id,
            paymentAssociations
          );

          if (paymentWithAssociations) {
            await PaymentReceiptEmailService.sendPaymentReceiptsByType(
              paymentWithAssociations,
              payment.type
            );
          }
        } catch (err) {
          console.error(
            `Failed to send payment receipt email for payment ${payment.id}:`,
            err.message
          );
        }
      }
    });
  } catch (error) {
    errorResponse(res, `Error creating ${resourceName}`, error.message);
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }
    const updatedBy = req.user ? req.user.id : null;
    await payment.update(req.body, {
      userId: updatedBy,
      req: req
    });

    successResponse(res, `${resourceName} updated successfully`, payment);
    process.nextTick(async () => {
      try {
        const paymentWithAssociations = await Payment.findByPk(
          req.params.id,
          {
            include: [
              {
                model: Reservation,
                as: 'reservation'
              }
            ]
          }
        );

        if (paymentWithAssociations) {
          await PaymentReceiptEmailService.sendPaymentReceiptsByType(
            paymentWithAssociations,
            paymentWithAssociations.type
          );
        }
      } catch (err) {
        console.error(
          `Failed to send payment receipt email for payment ${payment.id}:`,
          err.message
        );
      }
    });
  } catch (error) {
    errorResponse(res, `Error updating ${resourceName}`, error.message);
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }
    const deletedBy = req.user ? req.user.id : null;

    await payment.destroy({
      userId: deletedBy,
      req: req
    });
    successResponse(res, `${resourceName} deleted successfully`);
  } catch (error) {
    errorResponse(res, `Error deleting ${resourceName}`, error.message);
  }
};

exports.sendPaymentInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Get payment with all necessary associations
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Reservation,
          as: 'reservation',
          include: [
            { model: Customer, as: 'customers' },
            { model: Hotel, as: 'hotels' }
          ]
        }
      ]
    });

    if (!payment) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }

    const reservation = payment?.reservation;

    const customerEmail = extractEmail(reservation?.customers?.email);
    if (customerEmail) {
      PaymentInvoice.sendPaymentInvoiceToCustomer(payment, customerEmail);
    }

    successResponse(res, 'Payment invoice sent successfully', {});
  } catch (error) {
    errorResponse(res, `Error sending payment invoice`, error.message);
  }
};

exports.sendHotelPaymentReceipt = async (req, res) => {
  try {
    const { paymentIds } = req.body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return errorResponse(res, 'Payment IDs are required', null, 400);
    }

    // Get payments with all necessary associations
    const payments = await Payment.findAll({
      where: {
        id: paymentIds
      },
      include: [
        {
          model: Reservation,
          as: 'reservation',
          include: [
            { model: Customer, as: 'customers' },
            {
              model: Hotel, as: 'hotels', include: [
                { model: State, as: 'state' },
                { model: City, as: 'city' },
                { model: Country, as: 'country' }
              ]
            }
          ]
        }
      ]
    });

    if (payments.length === 0) {
      return errorResponse(res, 'No payments found', null, 404);
    }

    // Send consolidated receipts to hotels
    const emailResults = await HotelPaymentReceiptService.sendBulkPaymentReceipts(payments);

    successResponse(res, 'Hotel payment receipts sent successfully', {
      emailResults: emailResults
    });
  } catch (error) {
    errorResponse(res, `Error sending hotel payment receipts`, error.message);
  }
};

exports.sendPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Get payment with all necessary associations
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Reservation,
          as: 'reservation',
          include: [
            { model: Customer, as: 'customers' },
            {
              model: Hotel, as: 'hotels', include: [
                { model: State, as: 'state' },
                { model: City, as: 'city' },
                { model: Country, as: 'country' },
                { model: FinancialInformation, as: 'financialInformation' }
              ]
            }
          ]
        }
      ]
    });

    if (!payment) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }

    // Send payment receipt emails based on type
    PaymentReceiptEmailService.sendPaymentReceiptsByType(payment, payment.type);

    successResponse(res, 'Payment receipt sent successfully');
  } catch (error) {
    errorResponse(res, `Error sending payment receipt`, error.message);
  }
};

exports.cancelPayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return errorResponse(res, `${resourceName} not found`, null, 404);
    }

    if (payment.isCancel) {
      return errorResponse(res, `${resourceName} is already canceled`, null, 400);
    }

    const updatedBy = req.user ? req.user.id : null;
    await payment.update({ isCancel: true }, {
      userId: updatedBy,
      req: req
    });

    successResponse(res, `${resourceName} canceled successfully`, payment);
  } catch (error) {
    errorResponse(res, `Error canceling ${resourceName}`, error.message);
  }
};

// Helper function to extract email from JSON/JSONB field
const extractEmail = (emailField) => {
  if (!emailField) return null;
  if (Array.isArray(emailField)) {
    return emailField[0] || null;
  }
  return emailField;
};