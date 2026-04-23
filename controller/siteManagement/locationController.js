const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { Location, Country, State, City } = require("../../db/models");
const { Op } = require("sequelize");
const { buildWhereClause } = require("../../helper/filter");

let resourceName = "Location";

module.exports = {
  getAll: async (req, res) => {
    try {
      const data = await Location.findAll({
        include: [
          { model: Country, as: "country" },
          { model: State, as: "state" },
          { model: City, as: "city" },
        ],
      });
      successResponse(res, `${resourceName} fetched successfully`, data);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, orderBy = "DESC" } = req.query;

      const offset = (page - 1) * limit;

      const filterConfig = {
        name: "like",
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
      };

      const where = buildWhereClause(req.query, filterConfig);

      const { rows: locations, count: totalRecords } =
        await Location.findAndCountAll({
          where,
          include: [
            { model: Country, as: "country" },
            { model: State, as: "state" },
            { model: City, as: "city" },
          ],
          offset: +offset,
          limit: +limit,
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        locations,
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
        locationDetails,
      } = req.body;
      const createdBy = req?.user?.id;

      const payload = locationDetails.map((document) => ({
        countryId,
        stateId,
        cityId,
        createdBy,
        name: document.name,
        latitude: document.latitude,
        longitude: document.longitude,
        image: document.image,
        description: document.description,
      }));

      const data = await Location.bulkCreate(payload, {
        userId: createdBy,
        req: req
      });

      successResponse(
        res,
        `${resourceName} created successfully`,
        data,
        201
      );
    } catch (error) {
      console.error("Error in create controller:", error.message);
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Location.findByPk(id);
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
        countryId,
        stateId,
        cityId,
        name,
        latitude,
        longitude,
        image,
        description,
      } = req.body;

      const data = await Location.findByPk(id);
      if (!data) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      const updatedData = {
        countryId,
        stateId,
        cityId,
        name,
        latitude,
        longitude,
        image,
        description,
      };

      const updatedBy = req.user ? req.user.id : null;
      
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
      
      const data = await Location.destroy({ 
        where: { id },
        userId: deletedBy,
        req: req
      });
      
      if (!data) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }
      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
