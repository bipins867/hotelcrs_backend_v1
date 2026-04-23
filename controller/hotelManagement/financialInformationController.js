const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { FinancialInformation, Hotel } = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");

let resourceName = "Financial Information";

// Reusable create logic
const createFinancialInformation = async (data, userId, req) => {
  const createdBy = userId || null;
  const { hotelId, beneficiaryName, bankName, accountNumber, ifscCode, swiftCode, branchAddress, bankCountryId, bankStateId, bankCityId, gstNumber, gstRegisteredName, gstAddress,  gstDetails, b2bCommission, b2cCommission } =
        data;
  const newFinancialInformation = await FinancialInformation.create({
    hotelId, beneficiaryName, bankName, accountNumber, ifscCode, swiftCode, branchAddress, bankCountryId, bankStateId, bankCityId, gstNumber, gstRegisteredName, gstAddress,  gstDetails, b2bCommission, b2cCommission,
    createdBy,
  }, {
    userId: createdBy,
    req: req
  });
  return newFinancialInformation;
};

module.exports = {
  getAll: async (req, res) => {
    try {
      const financialInformations = await FinancialInformation.findAll({
        include: [{ model: Hotel, as: "hotel" }],
      });
      successResponse(
        res,
        `${resourceName} fetched successfully`,
        financialInformations
      );
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, orderBy = "DESC" } = req.query;
      const offset = (page - 1) * limit;

      const filterConfig = {
        bankDetails: "like",
        gstDetails: "like",
        b2bCommission: "exact",
        b2cCommission: "exact",
      };

      const where = buildWhereClause(req.query, filterConfig);

      const { rows: financialInformations, count: totalRecords } =
        await FinancialInformation.findAndCountAll({
          where,
          offset: +offset,
          limit: +limit,
          include: [{ model: Hotel, as: "hotel" }],
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        financialInformations,
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
      const data = req.body;
      const userId = req.user?.id;

      const newFinancialInformation = await createFinancialInformation(data, userId, req);

      successResponse(
        res,
        `${resourceName} created successfully`,
        newFinancialInformation,
        201
      );
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const financialInformation = await FinancialInformation.findByPk(id, {
        include: [{ model: Hotel, as: "hotel" }],
      });

      if (!financialInformation) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(
        res,
        `${resourceName} fetched successfully`,
        financialInformation
      );
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const data = req.body;
      const { hotelId, beneficiaryName, bankName, accountNumber, ifscCode, swiftCode, branchAddress, bankCountryId, bankStateId, bankCityId, gstNumber, gstRegisteredName, gstAddress,  gstDetails, b2bCommission, b2cCommission } =
        req.body;
      const userId = req.user?.id;

      const financialInformation = await FinancialInformation.findOne({ where: { hotelId } });

      if (financialInformation) {
        await financialInformation.update({
          hotelId, beneficiaryName, bankName, accountNumber, ifscCode, swiftCode, branchAddress, bankCountryId, bankStateId, bankCityId, gstNumber, gstRegisteredName, gstAddress,  gstDetails, b2bCommission, b2cCommission,
          updatedBy: userId,
        }, {
          userId: userId,
          req: req
        });

        successResponse(
          res,
          `${resourceName} updated successfully`,
          financialInformation
        );
      } else {
        const createdRecord = await createFinancialInformation(req.body, userId, req);
        successResponse(
          res,
          `${resourceName} created successfully`,
          createdRecord,
          201
        );
      }
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;
      
      const financialInformation = await FinancialInformation.destroy({
        where: { id },
        userId: deletedBy,
        req: req
      });

      if (!financialInformation) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
