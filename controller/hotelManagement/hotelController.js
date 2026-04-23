const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const {
  Hotel,
  Country,
  State,
  City,
  Location,
  FinancialInformation,
  Policy,
  HotelTeam,
  HotelMedia,
  HotelDetails,
  HotelChain,
  Room,
  TaggedRatePlan,
  RatePlan
} = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");
const { fetchAssignHotelId } = require("../common/helper");

let resourceName = "Hotel";

module.exports = {
  getAll: async (req, res) => {
    try {
      const { name, countryId, stateId, cityId, typeOfHotel, isDraft } = req.query;
      const filterConfig = {
        name: "like",
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
        typeOfHotel: "like",
        isDraft: "boolean",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      if (assignHotelId) {
        filterConfig.id = "in";
      }

      const wherePayload = {
        name,
        countryId,
        stateId,
        cityId,
        typeOfHotel,
        isDraft,
        id: assignHotelId
      };

      const where = buildWhereClause(wherePayload, filterConfig);

      const hotels = await Hotel.findAll({
        where,
        include: [
          { model: Country, as: "country" },
          { model: State, as: "state" },
          { model: City, as: "city" },
        ],
      });
      successResponse(res, `${resourceName} fetched successfully`, hotels);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const {
        page = 1, limit = 10, orderBy = "DESC",
        name, countryId, stateId, cityId, locationId,
        typeOfHotel, isDraft, mobile, email
      } = req.query;
      const offset = (page - 1) * limit;

      const filterConfig = {
        name: "like",
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
        locationId: "exact",
        typeOfHotel: "like",
        isDraft: "exact",
        mobile: "json",
        email: "json",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      if (assignHotelId) {
        filterConfig.id = "in";
      }

      const wherePayload = {
        name,
        countryId,
        stateId,
        cityId,
        locationId,
        typeOfHotel,
        isDraft,
        mobile,
        email,
        id: assignHotelId
      };

      const where = buildWhereClause(wherePayload, filterConfig);
      const financialWhere = buildWhereClause(req.query, {
        gstNumber: "like",
      });
      const hotelChainWhere = buildWhereClause(
        { name: req.query.hotelChainName },
        { name: "like" }
      );

      const { rows: hotels, count: totalRecords } = await Hotel.findAndCountAll({
        where,
        offset: +offset,
        limit: +limit,
        distinct: true,
        include: [
          { model: Country, as: "country" },
          { model: State, as: "state" },
          { model: City, as: "city" },
          { model: Location, as: "location" },
          {
            model: HotelChain,
            as: "hotelChain",
            attributes: ["name"],
            ...(req.query.hotelChainName ? { where: hotelChainWhere } : {}),
          },
          { model: FinancialInformation, as: "financialInformation", ...(req.query.gstNumber ? { where: financialWhere } : {}) },
          { model: Policy, as: "policy" },
          { model: HotelMedia, as: "media" },
          { model: HotelDetails, as: "additionalHotelDetails" },
          {
            model: HotelTeam,
            as: "team",
            separate: true,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          },
          {
            model: Room,
            as: "room",
            separate: true,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          },
        ],

        order: [["createdAt", orderBy]],
      });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `Hotels fetched successfully`, {
        hotels,
        totalRecords,
        totalPages,
        currentPage: +page,
      });
    } catch (error) {
      errorResponse(res, `Error fetching hotels`, error.message);
    }
  },

  create: async (req, res) => {
    try {
      const {
        name,
        hotelChainId,
        address,
        countryId,
        stateId,
        cityId,
        locationId,
        logo,
        map,
        latitude,
        longitude,
        typeOfHotel,
        numberOfRooms,
        phone,
        mobile,
        website,
        email,
        hotelGstRegStatus,
        gstInvoiceIssuedToGuestBy,
        gstReturnFilingResponsibility
      } = req.body;

      const createdBy = req.user ? req.user.id : null;


      const newHotel = await Hotel.create({
        name,
        hotelChainId,
        createdBy,
        address,
        countryId,
        stateId,
        cityId,
        locationId,
        logo,
        map,
        latitude,
        longitude,
        typeOfHotel,
        numberOfRooms,
        phone,
        mobile,
        website,
        email,
        hotelGstRegStatus,
        gstInvoiceIssuedToGuestBy,
        gstReturnFilingResponsibility
      }, {
        userId: createdBy,
        req: req
      });

      const hotelCode = String(newHotel.id).padStart(10, "0");
      newHotel.hotelCode = hotelCode;
      await newHotel.save();

      successResponse(
        res,
        `${resourceName} created successfully`,
        newHotel,
        201
      );
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const hotel = await Hotel.findByPk(id, {
        include: [
          { model: Country, as: "country" },
          { model: State, as: "state" },
          { model: City, as: "city" },
          { model: FinancialInformation, as: "financialInformation" },
          { model: Policy, as: "policy" },
          { model: HotelTeam, as: "team" },
          { model: HotelMedia, as: "media" },
          { model: HotelDetails, as: "additionalHotelDetails" },
          { model: HotelChain, as: "hotelChain" },
          {
            model: Room,
            as: "room",
            include: [
              {
                model: TaggedRatePlan,
                as: "taggedRatePlan",
                include: [
                  {
                    model: RatePlan,
                    as: "ratePlan",
                  }
                ]
              },
            ],
          },
        ],
      });

      if (!hotel) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }
      successResponse(res, `${resourceName} fetched successfully`, hotel);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        hotelChainId,
        address,
        countryId,
        stateId,
        cityId,
        locationId,
        logo,
        map,
        latitude,
        longitude,
        typeOfHotel,
        numberOfRooms,
        phone,
        mobile,
        website,
        email,
        hotelGstRegStatus,
        gstInvoiceIssuedToGuestBy,
        gstReturnFilingResponsibility
      } = req.body;

      const updatedBy = req.user ? req.user.id : null;

      const hotel = await Hotel.findByPk(id);
      if (!hotel) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      const updatedData = {
        name: name || hotel.name,
        hotelChainId: hotelChainId || hotel.hotelChainId,
        updatedBy: updatedBy || hotel.updatedBy,
        address: address || hotel.address,
        countryId: countryId || hotel.countryId,
        stateId: stateId || hotel.stateId,
        cityId: cityId || hotel.cityId,
        locationId,
        logo: logo || hotel.logo,
        map: map || hotel.map,
        latitude: latitude || hotel.latitude,
        longitude: longitude || hotel.longitude,
        typeOfHotel: typeOfHotel || hotel.typeOfHotel,
        numberOfRooms: numberOfRooms || hotel.numberOfRooms,
        phone: phone || hotel.phone,
        mobile: mobile || hotel.mobile,
        website: website || hotel.website,
        email: email || hotel.email,
        hotelGstRegStatus: hotelGstRegStatus,
        gstInvoiceIssuedToGuestBy: gstInvoiceIssuedToGuestBy,
        gstReturnFilingResponsibility: gstReturnFilingResponsibility
      };

      await hotel.update(updatedData, {
        userId: updatedBy,
        req: req
      });

      successResponse(res, `${resourceName} updated successfully`, hotel);
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;

      const hotel = await Hotel.destroy({
        where: { id },
        userId: deletedBy,
        req: req
      });

      if (!hotel) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
