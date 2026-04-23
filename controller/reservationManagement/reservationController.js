const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const {
  Reservation, BookingDetail, Hotel, Customer, TravelPartner, PaymentType,
  Room, RatePlan, State, FinancialInformation, Policy, City, Payment, Country, Commission,
} = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");
const { generateReservationExcelReport, generateReservationBookingExcelReport } = require("../../utils/excelHelper");
const ReservationEmailService = require("../../services/ReservationEmailService");
const BookingConfirmationService = require("../../services/BookingConfirmationService");
const { getCompanyDetails } = require("../../utils/common");
const ReservationWhatsAppService = require("../../services/ReservationWhatsAppService");
const { RESERVATION_STATUS_OPTIONS } = require("../../utils/helper");
const { createBookingId, fetchAssignHotelId } = require("../common/helper");
const { Op } = require("sequelize");
const ReservationTaxInvoiceService = require("../../services/ReservationTaxInvoiceService");

let resourceName = "Reservation";

const fetchCancelPaymentType = async (status, hotelNote, customerNote, adminNote) => {
  if (status !== RESERVATION_STATUS_OPTIONS.CANCELLED) {
    return {
      hotelNote,
      customerNote,
      adminNote
    }
  }

  const paymentTypeRes = await PaymentType.findOne({ where: { name: 'Cancelled Booking' } });
  if (!paymentTypeRes) {
    return {
      hotelNote,
      customerNote,
      adminNote
    }
  }

  return {
    hotelNote: paymentTypeRes.hotelNote,
    customerNote: paymentTypeRes.customerNote,
    adminNote: paymentTypeRes.adminNote
  }
}

exports.createReservation = async (req, res) => {
  try {
    const { bookingDetails, ...reservationData } = req.body;
    const createdBy = req.user ? req.user.id : null;
    reservationData.createdBy = createdBy;

    const policy = await Policy.findOne({ where: { hotelId: reservationData.hotelId } });

    if (policy) {
      reservationData.generalPolicies = policy.generalPolicies;
      reservationData.corporatePolicies = policy.corporatePolicies;
      reservationData.bulkGroupPolicies = policy.bulkGroupPolicies;
    }

    const reservation = await Reservation.create(reservationData, {
      userId: createdBy,
      req: req
    });

    if (Array.isArray(bookingDetails)) {
      const details = bookingDetails.map((detail) => ({
        ...detail,
        reservationId: reservation.id,
      }));
      await BookingDetail.bulkCreate(details, {
        userId: createdBy,
        req: req
      });
    }

    const reservationResult = await Reservation.findOne({
      where: { id: reservation.id },
      include: [
        {
          model: BookingDetail, as: "bookingDetails",
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: 'ratePlans' }
          ]
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel, as: "hotels", include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
            { model: FinancialInformation, as: "financialInformation" },
            { model: Policy, as: "policy" },
            { model: Commission, as: "commission" }
          ]
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ],
    });

    const reservationJson = reservationResult?.toJSON ? reservationResult?.toJSON() : reservationResult;

    const oldData = {
      bookingDetails: reservationJson.bookingDetails?.map((booking) => ({ id: booking.id, rooms: booking.rooms, ratePlans: booking.ratePlans })),
      customers: reservationJson.customers,
      hotels: reservationJson.hotels,
      travelPartner: reservationJson.travelPartner,
      paymentTypes: reservationJson.paymentTypes,
      companyDetails: await getCompanyDetails({ includeSignedUrls: false }),
    }

    const bookingId = await createBookingId(reservation);
    await reservation.update({ bookingId: bookingId, oldData });

    const reservations = await Reservation.findOne({
      where: { id: reservation.id },
      include: [
        {
          model: BookingDetail, as: "bookingDetails",
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: 'ratePlans' }
          ]
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel, as: "hotels", include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" }
          ]
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" }
      ],
    });

    // If Direct Payment, notify hotel via WhatsApp with payment details (non-blocking)
    try {
      if (reservations?.paymentTypes?.name === 'Direct Payment') {
        setImmediate(async () => {
          try {
            const waResult = await ReservationWhatsAppService.sendDirectPaymentNewBookingToHotel(reservations);
            console.log('Direct Payment hotel WhatsApp result:', waResult);

            const dpGuest = await ReservationWhatsAppService.sendDirectPaymentCreatedToGuest(reservations);
            console.log('Direct Payment modified reservation WhatsApp (guest) result:', dpGuest);

          } catch (dpErr) {
            console.error('Failed to send direct payment WhatsApp to hotel:', dpErr);
          }
        });
      }
    } catch (dpErr) {
      console.error('Failed to queue direct payment WhatsApp to hotel:', dpErr);
    }

    // Send WhatsApp notification for new booking (non-blocking)
    try {
      setImmediate(async () => {
        try {

          const reservationDetails = reservations?.toJSON ? reservations.toJSON() : reservations;
          const emailResults = ReservationEmailService.sendReservationEmails(reservationDetails, reservationDetails.status);
          console.log('Reservation emails sent:', emailResults);

          const whatsappResult = await ReservationWhatsAppService.sendNewBookingNotification(reservations);
          console.log('Reservation WhatsApp notification sent:', whatsappResult);
        } catch (whatsappError) {
          console.error('Failed to send reservation WhatsApp notification:', whatsappError);
        }
      });
    } catch (whatsappError) {
      console.error('Failed to queue reservation WhatsApp notification:', whatsappError);
    }

    return successResponse(res, `Reservation created successfully`, reservation);
  } catch (error) {
    return errorResponse(res, `Error creating Reservation`, error.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const { hotelId } = req.query;

    const wherePayload = {
      hotelId,
    };

    const filterConfig = {
      hotelId: "exact",
    };

    const assignHotelId = fetchAssignHotelId(req?.user);

    if (assignHotelId) {
      if (hotelId) {
        if (!assignHotelId.includes(Number(hotelId))) {
          return errorResponse(res, `You are not authorized to access this hotel.`, [], 400);
        }
      } else {
        wherePayload.hotelId = assignHotelId;
        filterConfig.hotelId = "in";
      }
    }

    const where = buildWhereClause(wherePayload, filterConfig);

    const data = await Reservation.findAll({
      where,
      include: [
        { model: BookingDetail, as: "bookingDetails" },
        { model: Customer, as: "customers" },
        { model: Hotel, as: "hotels" },
      ],
    });
    successResponse(res, `${resourceName} fetched successfully`, data);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.findById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Reservation.findByPk(id, {
      include: [
        { model: BookingDetail, as: "bookingDetails", include: [{ model: Room, as: "rooms" }, { model: RatePlan, as: 'ratePlans' }] },
        { model: Customer, as: "customers" },
        {
          model: Hotel, as: "hotels", include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
            { model: FinancialInformation, as: "financialInformation" },
            { model: Policy, as: "policy" },
            { model: Commission, as: "commission" }
          ]
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ],
    });
    if (!data)
      return errorResponse(res, `${resourceName} not found`, null, 404);
    successResponse(res, `${resourceName} fetched successfully`, data);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.findByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await Reservation.findOne({
      where: {
        bookingId: bookingId
      },
      include: [{ model: BookingDetail, as: "bookingDetails", include: [{ model: Room, as: "rooms" }, { model: RatePlan, as: 'ratePlans' }] },
      { model: Customer, as: "customers" },
      { model: Hotel, as: "hotels", include: [{ model: State, as: "state" }, { model: City, as: "city" }, { model: Country, as: "country" }, { model: FinancialInformation, as: "financialInformation" }, { model: Policy, as: "policy" }] },
      { model: TravelPartner, as: "travelPartner" },
      { model: PaymentType, as: "paymentTypes" },
      ],
    });

    successResponse(res, `${resourceName} fetched successfully`, data);
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user ? req.user.id : null;

    const data = await Reservation.destroy({
      where: { id },
      userId: deletedBy,
      req: req
    });

    if (!data) return errorResponse(res, "Data not found", null, 404);
    successResponse(res, `${resourceName} deleted successfully`);
  } catch (error) {
    errorResponse(res, `Error deleting ${resourceName}`, error.message);
  }
};

exports.findAndCountAll = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, orderBy = "DESC", roomId, ratePlanId,
      hotelId, paymentTypeId, customerId, travelAgentId, bookingId, pnr,
      fromBookingDate, toBookingDate, checkingDate, netAmt, saleAmt, status,
      totalNight, totalRooms, totalAdults
    } = req.query;
    const offset = (page - 1) * limit;

    const wherePayload = {
      hotelId,
      paymentTypeId,
      customerId,
      travelAgentId,
      bookingId,
      pnr,
      checkingDate,
      netAmt,
      saleAmt,
      status,
      totalNight,
      totalRooms,
      totalAdults,
    };

    if (fromBookingDate && toBookingDate) {
      wherePayload.createdAt = {
        [Op.between]: [
          new Date(`${fromBookingDate}T00:00:00.000Z`),
          new Date(`${toBookingDate}T23:59:59.999Z`)
        ]
      };
    }

    const queryParams = {
      hotelId: "exact",
      paymentTypeId: "exact",
      customerId: "exact",
      travelAgentId: "exact",
      bookingId: "exact",
      pnr: "like",
      createdAt: "range",
      checkingDate: "range",
      netAmt: "exact",
      saleAmt: "exact",
      status: "like",
      totalNight: "exact",
      totalRooms: "exact",
      totalAdults: "exact",
    };

    const assignHotelId = fetchAssignHotelId(req?.user);

    if (assignHotelId) {
      if (hotelId) {
        if (!assignHotelId.includes(Number(hotelId))) {
          return errorResponse(res, `You are not authorized to access this hotel.`, [], 400);
        }
      } else {
        wherePayload.hotelId = assignHotelId;
        queryParams.hotelId = "in";
      }
    }

    const where = buildWhereClause(wherePayload, queryParams);
    const bookingDetailWhere = roomId ? { roomId: roomId } : {};

    if (ratePlanId) {
      bookingDetailWhere.ratePlanId = ratePlanId;
    }

    const { rows, count } = await Reservation.findAndCountAll({
      where,
      offset: +offset,
      limit: +limit,
      order: [["createdAt", orderBy]],
      include: [
        { model: BookingDetail, as: "bookingDetails", where: bookingDetailWhere },
        { model: PaymentType, as: "paymentTypes" },
        { model: Hotel, as: "hotels" },
        { model: Customer, as: "customers" },
        { model: TravelPartner, as: "travelPartner" }
      ],
    });

    successResponse(res, `${resourceName} fetched successfully`, {
      reservations: rows,
      totalRecords: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    errorResponse(res, `Error fetching ${resourceName}`, error.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hotelId,
      customerId,
      checkingDate,
      checkoutDate,
      totalNight,
      totalRooms,
      travelAgentId,
      totalAdults,
      totalChildren,
      netAmt,
      saleAmt,
      otaCommission,
      roomCharges,
      hotelTaxes,
      advance,
      balance,
      pnr,
      cancellationPolicy,
      gstReminder,
      sendInvoice,
      comments,
      hotelNote,
      customerNote,
      adminNote,
      paymentTypeId,
      sendGuest,
      status,
      totalMargin,
      totalPayableAmount,
      tcs,
      tds,
      bookingDetails,
      isGstRelated
    } = req.body;

    const reservation = await Reservation.findByPk(id);

    if (!reservation) {
      return errorResponse(res, `Reservation not found`, null, 404);
    }

    const updatedBy = req.user ? req.user.id : null;

    const cancelPaymentTypeNotes = await fetchCancelPaymentType(status, hotelNote, customerNote, adminNote);

    await reservation.update({
      hotelId,
      customerId,
      checkingDate,
      checkoutDate,
      totalNight,
      totalRooms,
      travelAgentId,
      totalAdults,
      totalChildren,
      netAmt,
      saleAmt,
      otaCommission,
      roomCharges,
      hotelTaxes,
      advance,
      balance,
      pnr,
      cancellationPolicy,
      gstReminder,
      sendInvoice,
      comments,
      ...cancelPaymentTypeNotes,
      paymentTypeId,
      sendGuest,
      status,
      totalMargin,
      totalPayableAmount,
      tcs,
      tds,
      isGstRelated
    }, {
      userId: updatedBy,
      req: req
    });

    if (Array.isArray(bookingDetails)) {
      const existingDetails = await BookingDetail.findAll({
        where: { reservationId: reservation.id }
      });

      const incomingIds = bookingDetails.filter(d => d.id).map(d => d.id);
      const existingIds = existingDetails.map(d => d.id);

      const toDelete = existingIds.filter(id => !incomingIds.includes(id));
      if (toDelete.length > 0) {
        await BookingDetail.destroy({ where: { id: toDelete } });
      }

      for (const detail of bookingDetails) {
        if (detail.id) {
          await BookingDetail.update(
            { ...detail },
            { where: { id: detail.id } }
          );
        } else {
          await BookingDetail.create({
            ...detail,
            reservationId: reservation.id,
          });
        }
      }

    } else {
      await BookingDetail.destroy({
        where: { reservationId: reservation.id },
      });
    }

    const reservationResult = await Reservation.findOne({
      where: { id: id },
      include: [
        {
          model: BookingDetail, as: "bookingDetails",
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: 'ratePlans' }
          ]
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel, as: "hotels", include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
            { model: FinancialInformation, as: "financialInformation" },
            { model: Policy, as: "policy" },
            { model: Commission, as: "commission" }
          ]
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ],
    });

    const reservationJson = reservationResult?.toJSON ? reservationResult?.toJSON() : reservationResult;
    const oldData = {
      bookingDetails: reservationJson.bookingDetails?.map((booking) => ({ id: booking.id, rooms: booking.rooms, ratePlans: booking.ratePlans })),
      customers: reservationJson.customers,
      hotels: reservationJson.hotels,
      travelPartner: reservationJson.travelPartner,
      paymentTypes: reservationJson.paymentTypes,
      companyDetails: await getCompanyDetails({ includeSignedUrls: false }),
    }

    await reservation.update({ oldData });
    // Get updated reservation with all relations for email
    const updatedReservation = await Reservation.findByPk(reservation.id, {
      include: [
        {
          model: BookingDetail, as: "bookingDetails",
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: 'ratePlans' }
          ]
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel, as: "hotels", include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
            { model: FinancialInformation, as: "financialInformation" },
            { model: Policy, as: "policy" },
            { model: Commission, as: "commission" }
          ]
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ],
    });

    setImmediate(async () => {
      try {
        const emailResults = ReservationEmailService.sendReservationEmails(updatedReservation, updatedReservation.status);
        console.log('Reservation emails sent:', emailResults);
      } catch (whErr) {
        console.error('Failed to send modified reservation Email:', whErr);
      }
    });

    // Send WhatsApp message for modified reservation (non-blocking)
    try {
      if (reservationResult.status !== RESERVATION_STATUS_OPTIONS.CANCELLED) {
        setImmediate(async () => {
          try {
            const whatsappResult = await ReservationWhatsAppService.sendModifiedReservationNotification(updatedReservation);
            console.log('Modified reservation WhatsApp notification result:', whatsappResult);
            const guestResult = await ReservationWhatsAppService.sendModifiedReservationToGuest(updatedReservation);
            console.log('Guest modified reservation WhatsApp result:', guestResult);

            if (reservationResult?.paymentTypes?.name === 'Direct Payment') {
              const dpMod = await ReservationWhatsAppService.sendDirectPaymentModifiedToHotel(updatedReservation);
              console.log('Direct Payment modified reservation WhatsApp result:', dpMod);
              const dpGuestMod = await ReservationWhatsAppService.sendDirectPaymentModifiedToGuest(updatedReservation);
              console.log('Direct Payment modified reservation WhatsApp (guest) result:', dpGuestMod);
            }
          } catch (whErr) {
            console.error('Failed to send modified reservation WhatsApp:', whErr);
          }
        });
      }
    } catch (whErr) {
      console.error('Failed to queue modified reservation WhatsApp:', whErr);
    }

    try {
      if (reservationResult.status === RESERVATION_STATUS_OPTIONS.CANCELLED) {
        setImmediate(async () => {
          try {
            const cancelResult = await ReservationWhatsAppService.sendCancelledReservationNotification(updatedReservation);
            console.log('Cancelled reservation WhatsApp notification result:', cancelResult);
            const cancelGuestResult = await ReservationWhatsAppService.sendCancelledReservationToGuest(updatedReservation);
            console.log('Guest cancelled reservation WhatsApp result:', cancelGuestResult);
            if (reservationResult?.paymentTypes?.name === 'Direct Payment') {
              const dpCancel = await ReservationWhatsAppService.sendDirectPaymentCancelledToHotel(updatedReservation);
              console.log('Direct Payment cancellation WhatsApp result:', dpCancel);
              const dpGuestCancel = await ReservationWhatsAppService.sendDirectPaymentCancelledToGuest(updatedReservation);
              console.log('Direct Payment cancellation WhatsApp (guest) result:', dpGuestCancel);
            }
          } catch (cErr) {
            console.error('Failed to send cancelled reservation WhatsApp:', cErr);
          }
        });
      }
    } catch (cErr) {
      console.error('Failed to queue cancelled reservation WhatsApp:', cErr);
    }

    successResponse(res, `Reservation updated successfully`, updatedReservation);

  } catch (error) {
    console.error(error);
    errorResponse(res, `Error updating Reservation`, error.message);
  }
};

exports.confirmReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmedBy } = req.body;

    const reservation = await Reservation.findOne({ where: { bookingId: id } });
    if (!reservation) {
      return errorResponse(res, "Reservation not found", null, 404);
    }

    // Check if reservation is already confirmed
    if (reservation.isConfirmed === true) {
      return errorResponse(res, "Reservation is already confirmed", null, 400);
    }

    // Update reservation as confirmed
    await reservation.update({
      isConfirmed: true,
      confirmedBy: confirmedBy || null
    });

    // Get updated reservation with all relations for email
    const updatedReservation = await Reservation.findByPk(reservation.id, {
      include: [
        { model: BookingDetail, as: "bookingDetails", include: [{ model: Room, as: "rooms" }, { model: RatePlan, as: 'ratePlans' }] },
        { model: Customer, as: "customers" },
        { model: Hotel, as: "hotels", include: [{ model: State, as: "state" }, { model: City, as: "city" }, { model: Country, as: "country" }, { model: FinancialInformation, as: "financialInformation" }, { model: Policy, as: "policy" }] },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ],
    });

    // Send WhatsApp booking confirmation to guest (non-blocking)
    try {
      setImmediate(async () => {
        try {
          await BookingConfirmationService.sendBookingCreatedEmail(updatedReservation);
          await ReservationWhatsAppService.sendBookingConfirmationToGuest(updatedReservation);
        } catch (wErr) {
          console.error('Failed to send booking confirmation WhatsApp to guest:', wErr);
        }
      });
    } catch (wErr) {
      console.error('Failed to queue booking confirmation WhatsApp to guest:', wErr);
    }

    successResponse(res, "Reservation confirmed successfully", updatedReservation);

  } catch (error) {
    console.error("Reservation confirmation error:", error);
    errorResponse(res, "Error confirming reservation", error.message);
  }
};

exports.downloadReservationReport = async (req, res) => {
  try {
    const {
      reservationIds,
      isBooking = false,
      roomId,
      ratePlanId
    } = req.query;

    const query = {
      ...req.query,
    };

    if (query?.fromBookingDate && query?.toBookingDate) {
      query.createdAt = {
        [Op.between]: [
          new Date(`${query.fromBookingDate}T00:00:00.000Z`),
          new Date(`${query.toBookingDate}T23:59:59.999Z`)
        ]
      };
    }

    const queryParams = {
      hotelId: "exact",
      paymentTypeId: "exact",
      customerId: "exact",
      travelAgentId: "exact",
      bookingId: "exact",
      pnr: "like",
      createdAt: "range",
      checkingDate: "range",
      netAmt: "exact",
      saleAmt: "exact",
      status: "like",
      totalNight: "exact",
      totalRooms: "exact",
      totalAdults: "exact",
    };

    if (reservationIds) {
      const ids = reservationIds.split(',');
      if (ids.length > 0) {
        query.bookingId = ids;
        queryParams.bookingId = 'in';
      }
    }

    const assignHotelId = fetchAssignHotelId(req?.user);

    if (assignHotelId) {
      if (query?.hotelId) {
        if (!assignHotelId.includes(Number(query?.hotelId))) {
          return errorResponse(res, `You are not authorized to access this hotel.`, [], 400);
        }
      } else {
        query.hotelId = assignHotelId;
        queryParams.hotelId = "in";
      }
    }

    const where = buildWhereClause(query, queryParams);
    const bookingDetailWhere = roomId ? { roomId: roomId } : {};

    if (ratePlanId) {
      bookingDetailWhere.ratePlanId = ratePlanId;
    }

    // Fetch reservations with all related data
    const reservations = await Reservation.findAll({
      where: where,
      include: [
        {
          model: BookingDetail,
          as: "bookingDetails",
          where: bookingDetailWhere,
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: 'ratePlans' }
          ]
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel, as: "hotels", include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
            { model: Commission, as: "commission" }
          ]
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
        { model: Payment, as: "payments" }
      ],
      order: [['checkingDate', 'ASC']]
    });

    if (!reservations || reservations.length === 0) {
      return errorResponse(res, "No reservations found for the specified criteria", null, 404);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

    let workbook;
    let filename = `reservation_report_${timestamp}.xlsx`;
    if (isBooking) {
      filename = `booking_report_${timestamp}.xlsx`;
      workbook = await generateReservationBookingExcelReport(reservations);
    } else {
      workbook = await generateReservationExcelReport(reservations);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Report export error:', error);
    errorResponse(res, 'Error generating report', error.message);
  }
};

/**
 * Send reservation emails based on selected recipients
 * Body flags: { welcomeToCustomer, toCustomer, toHotel, toAdmin }
 */
exports.sendReservationEmails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      welcomeToCustomer = false,
      toCustomer = false,
      toHotel = false,
      toAdmin = false,
    } = req.body || {};

    // ✅ Load reservation and related entities
    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: BookingDetail,
          as: "bookingDetails",
          include: [
            { model: Room, as: "rooms" },
            { model: RatePlan, as: "ratePlans" },
          ],
        },
        { model: Customer, as: "customers" },
        {
          model: Hotel,
          as: "hotels",
          include: [
            { model: State, as: "state" },
            { model: City, as: "city" },
            { model: Country, as: "country" },
            { model: FinancialInformation, as: "financialInformation" },
            { model: Policy, as: "policy" },
          ],
        },
        { model: TravelPartner, as: "travelPartner" },
        { model: PaymentType, as: "paymentTypes" },
      ],
    });

    if (!reservation) {
      return errorResponse(res, `Reservation not found`, null, 404);
    }

    const shouldSendCustomer = welcomeToCustomer || toCustomer;
    const payload = reservation.toJSON ? reservation.toJSON() : reservation;

    // ✅ Queue info (for logging or debugging)
    const queued = {
      hotel: !!toHotel,
      customer: !!shouldSendCustomer,
      admin: !!toAdmin,
    };

    // ✅ Respond immediately — non-blocking
    successResponse(res, "Emails sent successfully", queued);

    // ✅ Fire and forget (background async)
    queueMicrotask(async () => {
      try {
        const promises = [];

        if (toHotel)
          promises.push(ReservationEmailService.sendReservationEmailToHotel(payload, payload.status));
        if (shouldSendCustomer)
          promises.push(ReservationEmailService.sendReservationEmailToCustomer(payload, payload.status));
        if (toAdmin)
          promises.push(ReservationEmailService.sendReservationEmailToAdmin(payload, payload.status));

        // Run all concurrently but don't block request lifecycle
        await Promise.allSettled(promises);
      } catch (bgError) {
        console.error("Background email sending error:", bgError);
      }
    });

  } catch (error) {
    return errorResponse(res, `Error sending emails`, error.message);
  }
};

/**
 * Send reservation invoice email (hotel + admin) and GST invoice to customer
 */
exports.sendReservationInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reservation exists
    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: Customer,
          as: "customers",
          attributes: ['id', 'name', 'email']
        },
        {
          model: Hotel,
          as: "hotels",
          attributes: ['name'],
          include: [
            { model: City, as: "city", attributes: ['name'] },
            { model: State, as: "state", attributes: ['name'] },
            { model: Country, as: "country", attributes: ['name'] }
          ]
        }
      ]
    });

    if (!reservation) {
      return errorResponse(res, `Reservation not found`, null, 404);
    }

    // Respond first, then send in background
    successResponse(res, `Invoice sent on email successfully`);

    queueMicrotask(async () => {
      await ReservationTaxInvoiceService.sendTaxInvoice(reservation);
    });

  } catch (error) {
    console.error('Error in sendReservationInvoice controller:', error);
    return errorResponse(res, `Error sending reservation invoice`, error.message);
  }
};

