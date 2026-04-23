const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { TravelPartner, Country, State, City } = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");

let resourceName = "TravelPartner";

module.exports = {
  getAll: async (req, res) => {
    try {
      const data = await TravelPartner.findAll({
        include: [
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
          },
        ],
      });

      successResponse(res, `${resourceName} fetched successfully`, data);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        orderBy = "DESC",
      } = req.query;

      const offset = (page - 1) * limit;

      const filterConfig = {
        partnerName: "like",
        contactDetails: "like",
        bankName: "like",
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
      };

      const where = buildWhereClause(req.query, filterConfig);

      const { rows: travelPartners, count: totalRecords } =
        await TravelPartner.findAndCountAll({
          where,
          include: [
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
            },
            {
              model: Country,
              as: "bankCountryDetails",
            },
            {
              model: State,
              as: "bankStateDetails",
            },
            {
              model: City,
              as: "bankCityDetails",
            },
          ],
          offset: +offset,
          limit: +limit,
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        travelPartners,
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
        partnerName,
        contactDetails,
        address,
        countryId,
        stateId,
        cityId,
        bankAccountNumber,
        ifscCode,
        swiftCode,
        bankName,
        bankCountry,
        bankState,
        bankCity,
        status,
        mobile,
        email
      } = req.body;
      const createdBy = req.user ? req.user.id : null;

      const data = await TravelPartner.create({
        partnerName,
        contactDetails,
        address,
        countryId,
        stateId,
        cityId,
        bankAccountNumber,
        ifscCode,
        swiftCode,
        bankName,
        bankCountry,
        bankState,
        bankCity,
        status,
        mobile,
        email,
        createdBy
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
      const data = await TravelPartner.findByPk(id);
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
        partnerName,
        contactDetails,
        address,
        cityId,
        stateId,
        countryId,
        bankAccountNumber,
        ifscCode,
        swiftCode,
        bankName,
        bankCity,
        bankState,
        bankCountry,
        status,
        mobile,
        email
      } = req.body;
      const updatedBy = req.user ? req.user.id : null;

      const data = await TravelPartner.findByPk(id);
      if (!data) {
        return errorResponse(res, "Data not found", null, 404);
      }

      const updatedData = {
        partnerName,
        contactDetails,
        address,
        cityId,
        stateId,
        countryId,
        bankAccountNumber,
        ifscCode,
        swiftCode,
        bankName,
        bankCity,
        bankState,
        bankCountry,
        status,
        mobile,
        email,
        updatedBy
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

      const data = await TravelPartner.destroy({
        where: { id: req.params.id },
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
