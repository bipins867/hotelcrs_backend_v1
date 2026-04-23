const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { Commission, Hotel, Country, State, City } = require("../../db/models");
const { Op } = require("sequelize");
const { buildWhereClause } = require("../../helper/filter");
const { FIXED_RATE_MODE, PERCENTAGE_RATE_MODE, FIXED_CHARGE_MODE } = require("./helper");
const { fetchAssignHotelId } = require("../common/helper");

let resourceName = "Commission";

module.exports = {
  getAll: async (req, res) => {
    try {
      const { hotelId, b2cCommission, b2bCommission, countryId, stateId, cityId } = req.query;

      const filterConfig = {
        hotelId: "exact",
        b2cCommission: "exact",
        b2bCommission: "exact",
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      const wherePayload = {
        hotelId,
        b2cCommission,
        b2bCommission,
        countryId,
        stateId,
        cityId,
      };

      if (assignHotelId) {
        if (hotelId) {
          if (!assignHotelId.includes(Number(hotelId))) {
            return errorResponse(res, `You are not authorized to access this hotel.`, [], 400);
          }
          wherePayload.hotelId = hotelId;
        } else {
          wherePayload.hotelId = assignHotelId;
          filterConfig.hotelId = "in";
        }
      }

      const where = buildWhereClause(wherePayload, filterConfig);

      const data = await Commission.findAll({ where });
      successResponse(res, `${resourceName} fetched successfully`, data);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const {
        page = 1, limit = 10, orderBy = "DESC",
        hotelId, b2cCommission, b2bCommission, countryId, stateId, cityId
      } = req.query;

      const offset = (page - 1) * limit;

      const filterConfig = {
        hotelId: "exact",
        b2cCommission: "exact",
        b2bCommission: "exact",
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      const wherePayload = {
        hotelId,
        b2cCommission,
        b2bCommission,
        countryId,
        stateId,
        cityId,
      };

      if (assignHotelId) {
        if (hotelId) {
          if (!assignHotelId.includes(Number(hotelId))) {
            return errorResponse(res, `You are not authorized to access this hotel.`, [], 400);
          }
          wherePayload.hotelId = hotelId;
        } else {
          wherePayload.hotelId = assignHotelId;
          filterConfig.hotelId = "in";
        }
      }

      const where = buildWhereClause(wherePayload, filterConfig);

      const { rows: commissions, count: totalRecords } =
        await Commission.findAndCountAll({
          where,
          include: [
            {
              model: Hotel,
              as: "hotel",
              ...(req.query.hotelName ? {
                where: {
                  name: {
                    [Op.iLike]: `%${req.query.hotelName}%`,
                  },
                }
              } : {}),
            },
            {
              model: Country,
              as: "country",
            },
            {
              model: State,
              as: "state",
            },
            {
              model: City,
              as: "city",
            }
          ],
          offset: +offset,
          limit: +limit,
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        commissions,
        totalRecords,
        totalPages,
        currentPage: page,
      });
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  create: async (req, res) => {
    try {
      const {
        countryId,
        stateId,
        cityId,
        hotelId,
        taggedHotels,
        b2bCommission,
        b2cCommission,
        comments,
        rateMode,
        singleOccupancy,
        doubleOccupancy,
        tripleOccupancy,
        extraBed,
        percentageModeValue,
        monthlySubscriptionCharge,
        monthlyChannelManagerCharge,
        bookingInstructions,
        documentUrl
      } = req.body;

      const isExists = await Commission.findOne({ where: { hotelId } });
      if (isExists) {
        return errorResponse(res, `Commission already exists`, null, 409);
      }

      let rateModeDetails = {
        singleOccupancy: null,
        doubleOccupancy: null,
        tripleOccupancy: null,
        extraBed: null,
        percentageModeValue: null,
        monthlySubscriptionCharge: null,
        monthlyChannelManagerCharge: null
      };

      if (rateMode === FIXED_RATE_MODE) {
        rateModeDetails = { ...rateModeDetails, singleOccupancy, doubleOccupancy, tripleOccupancy, extraBed };
      } else if (rateMode === PERCENTAGE_RATE_MODE) {
        rateModeDetails.percentageModeValue = percentageModeValue;
      } else if (rateMode === FIXED_CHARGE_MODE) {
        rateModeDetails = { ...rateModeDetails, monthlySubscriptionCharge, monthlyChannelManagerCharge };
      }

      const createdBy = req.user ? req.user.id : null;

      const data = await Commission.create({
        countryId,
        stateId,
        cityId,
        hotelId,
        taggedHotels,
        b2bCommission,
        b2cCommission,
        comments,
        rateMode,
        bookingInstructions,
        documentUrl,
        createdBy,
        ...rateModeDetails
      }, {
        userId: createdBy,
        req: req
      });
      successResponse(res, `${resourceName} created successfully`, data, 201);
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Commission.findByPk(id);
      if (!data) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }
      successResponse(res, `${resourceName} fetched successfully`, data);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        taggedHotels,
        b2bCommission,
        b2cCommission,
        comments,
        rateMode,
        singleOccupancy,
        doubleOccupancy,
        tripleOccupancy,
        extraBed,
        percentageModeValue,
        monthlySubscriptionCharge,
        monthlyChannelManagerCharge,
        bookingInstructions,
        documentUrl
      } = req.body;

      const data = await Commission.findByPk(id);
      if (!data) {
        return errorResponse(res, "Data not found", null, 404);
      }

      let rateModeDetails = {
        singleOccupancy: null,
        doubleOccupancy: null,
        tripleOccupancy: null,
        extraBed: null,
        percentageModeValue: null,
        monthlySubscriptionCharge: null,
        monthlyChannelManagerCharge: null,
      };

      if (rateMode === FIXED_RATE_MODE) {
        rateModeDetails = { ...rateModeDetails, singleOccupancy, doubleOccupancy, tripleOccupancy, extraBed };
      } else if (rateMode === PERCENTAGE_RATE_MODE) {
        rateModeDetails.percentageModeValue = percentageModeValue;
      } else if (rateMode === FIXED_CHARGE_MODE) {
        rateModeDetails = { ...rateModeDetails, monthlySubscriptionCharge, monthlyChannelManagerCharge };
      }

      const updatedBy = req.user ? req.user.id : null;

      const updatedData = {
        taggedHotels,
        b2bCommission,
        b2cCommission,
        comments,
        rateMode,
        updatedBy,
        bookingInstructions,
        documentUrl,
        ...rateModeDetails
      };

      await data.update(updatedData, {
        userId: updatedBy,
        req: req
      });

      successResponse(res, `${resourceName} updated successfully`, data);
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;

      const data = await Commission.destroy({
        where: { id },
        userId: deletedBy,
        req: req
      });

      if (!data) {
        return errorResponse(res, "Data not found", null, 404);
      }
      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
