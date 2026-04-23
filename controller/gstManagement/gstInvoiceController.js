const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { buildWhereClause } = require('../../helper/filter');
const { GSTInvoice, Reservation, Hotel, Customer, User, State, City } = require('../../db/models');
const { getSignedUrl } = require('../../utils/s3Helper');
const GSTInvoiceService = require('../../services/GSTInvoiceService');
const { fetchAssignHotelId } = require('../common/helper');
require("dotenv").config();

let resourceName = 'GST Invoice';

module.exports = {
  findAndCountAll: async (req, res) => {
    try {
      const {
        page = 1, limit = 10, orderBy = 'DESC',
        invoiceNumber, hotelId, customerId, invoiceDate, createdAt,
        status, isSystemGenerated, hotelName, guestName, gstNumber, guestEmail,
        guestMobile, companyName, bookingId, cityName, stateName
      } = req.query;
      const offset = (page - 1) * limit;

      const filterConfig = {
        invoiceNumber: 'like',
        hotelId: 'exact',
        customerId: 'exact',
        invoiceDate: 'range',
        createdAt: 'range',
        status: 'exact',
        isSystemGenerated: 'boolean'
      };

      const gstWhere = {
        invoiceNumber,
        hotelId,
        customerId,
        invoiceDate,
        createdAt,
        status,
        isSystemGenerated,
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      if (assignHotelId) {
        if (hotelId) {
          if (!assignHotelId.includes(hotelId)) {
            return errorResponse(res, `You are not authorized to access this hotel`, null, 403);
          }
        } else {
          filterConfig.hotelId = 'in';
          gstWhere.hotelId = assignHotelId;
        }
      }

      const where = buildWhereClause(gstWhere, filterConfig);

      const hotelWhere = buildWhereClause({ name: hotelName }, { name: 'like' });

      const customerWhere = buildWhereClause({
        name: guestName,
        gstNumber: gstNumber,
        email: guestEmail,
        mobile: guestMobile,
        gstName: companyName,
      }, { name: 'like', gstNumber: 'like', email: 'like', mobile: 'like', gstName: 'like' });

      const reservationWhere = buildWhereClause({ bookingId: bookingId }, { bookingId: 'like' });
      const cityWhere = buildWhereClause({ name: cityName }, { name: 'like' });
      const stateWhere = buildWhereClause({ name: stateName }, { name: 'like' });

      const { rows, count } = await GSTInvoice.findAndCountAll({
        where,
        offset: +offset,
        limit: +limit,
        include: [
          { model: Reservation, as: 'reservation', ...(bookingId ? { where: reservationWhere } : {}) },
          {
            model: Hotel,
            as: 'hotel',
            where: hotelWhere,
            include: [
              {
                model: State, as: 'state', where: stateWhere, attributes: ['id', 'name']
              },
              {
                model: City, as: 'city', where: cityWhere, attributes: ['id', 'name']
              }
            ]
          },
          { model: Customer, as: 'customer', where: customerWhere },
          { model: User, as: 'uploader', attributes: ['id', 'name'] }
        ],
        order: [['createdAt', orderBy]]
      });

      successResponse(res, `${resourceName} fetched successfully`, {
        invoices: rows,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      });
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const invoice = await GSTInvoice.findByPk(req.params.id, {
        include: [
          { model: Reservation, as: 'reservation' },
          { model: Hotel, as: 'hotel' },
          { model: Customer, as: 'customer' },
        ]
      });
      if (!invoice) return errorResponse(res, `${resourceName} not found`, null, 404);
      successResponse(res, `${resourceName} fetched successfully`, invoice);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findByReservationId: async (req, res) => {
    try {
      const { bookingId } = req.params;

      const invoice = await GSTInvoice.findOne({
        where: {
          reservationId: bookingId
        }
      });
      if (!invoice) return errorResponse(res, `${resourceName} not found`, null, 404);
      invoice.pdfUrl = invoice?.pdfUrl ? getSignedUrl(invoice?.pdfUrl, 'getObject', 3600, process.env.AWS_TAX_BUCKET_NAME) : null;

      successResponse(res, `${resourceName} fetched successfully`, invoice);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  create: async (req, res) => {
    try {
      const createdBy = req.user?.id || null;
      const payload = req.body;
      const gst = await GSTInvoice.create({ ...payload, createdBy }, { userId: createdBy, req });
      successResponse(res, `${resourceName} created successfully`, gst, 201);
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const invoice = await GSTInvoice.findByPk(req.params.id);
      if (!invoice) return errorResponse(res, `${resourceName} not found`, null, 404);
      const updatedBy = req.user?.id || null;
      await invoice.update({ ...req.body, updatedBy }, { userId: updatedBy, req });
      successResponse(res, `${resourceName} updated successfully`, invoice);
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  destroy: async (req, res) => {
    try {
      const invoice = await GSTInvoice.findByPk(req.params.id);
      if (!invoice) return errorResponse(res, `${resourceName} not found`, null, 404);
      await invoice.destroy({ userId: req.user?.id || null, req });
      successResponse(res, `${resourceName} deleted successfully`, {});
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },

  regenerate: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const updatedData = req.body;
      const invoice = await GSTInvoiceService.regenerateForBookingId(bookingId, updatedData);
      successResponse(res, `${resourceName} regenerated successfully`, invoice);
    } catch (error) {
      errorResponse(res, `Error regenerating ${resourceName}`, error.message);
    }
  }
};


