const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { Customer, Country, State, City } = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");

let resourceName = "Customer";

module.exports = {
  getAll: async (req, res) => {
    try {
      const customers = await Customer.findAll({
        include: [
          { model: Country, as: "country" },
          { model: State, as: "state" },
          { model: City, as: "city" },
        ],
      });
      successResponse(res, `${resourceName} fetched successfully`, customers);
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
        name: "like",
        email: "array",
        mobile: "array",
        gstNumber: "like",
        countryId: "exact",
        stateId: "exact",
        cityId: "exact",
        address: "like",
      };

      const where = buildWhereClause(req.query, filterConfig);

      const { rows: customers, count: totalRecords } =
        await Customer.findAndCountAll({
          where,
          offset: +offset,
          limit: +limit,
          include: [
            { model: Country, as: "country" },
            { model: State, as: "state" },
            { model: City, as: "city" },
          ],
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);
      successResponse(res, `Customers fetched successfully`, {
        customers,
        totalRecords,
        totalPages,
        currentPage: page,
      });
    } catch (error) {
      errorResponse(res, `Error fetching customers`, error.message);
    }
  },

  create: async (req, res) => {
    try {
      const {
        name,
        email,
        mobile,
        gstNumber,
        gstAddress,
        gstName,
        address,
        countryId,
        stateId,
        cityId,
      } = req.body;

      const createdBy = req.user ? req.user.id : null;

      const newCustomer = await Customer.create({
        name,
        email,
        mobile,
        gstNumber,
        gstAddress,
        gstName,
        address,
        countryId,
        stateId,
        cityId,
        createdBy
      }, {
        userId: createdBy,
        req: req
      });

      successResponse(
        res,
        `${resourceName} created successfully`,
        newCustomer,
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
      const customer = await Customer.findByPk(id, {
        include: [
          { model: Country, as: "country" },
          { model: State, as: "state" },
          { model: City, as: "city" },
        ],
      });

      if (!customer) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }
      successResponse(res, `${resourceName} fetched successfully`, customer);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        mobile,
        gstNumber,
        gstAddress,
        gstName,
        address,
        countryId,
        stateId,
        cityId,
      } = req.body;

      const customer = await Customer.findByPk(id);
      if (!customer) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }
      const updatedBy = req.user ? req.user.id : null;

      const updatedData = {
        name: name || customer.name,
        email: email || customer.email,
        mobile: mobile || customer.mobile,
        gstNumber: gstNumber || customer.gstNumber,
        gstAddress: gstAddress || customer.gstAddress,
        gstName: gstName || customer.gstName,
        address: address || customer.address,
        countryId: countryId || customer.countryId,
        stateId: stateId || customer.stateId,
        cityId: cityId || customer.cityId,
        updatedBy,
      };


      await customer.update(updatedData, {
        userId: updatedBy,
        req: req
      });

      successResponse(res, `${resourceName} updated successfully`, customer);
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;

      const customer = await Customer.destroy({
        where: { id },
        userId: deletedBy,
        req: req
      });

      if (!customer) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }
      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
