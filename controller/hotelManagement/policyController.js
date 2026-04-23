const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { Policy } = require('../../db/models');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Policy';

const createPolicy = async (req, res) => {
  const { hotelId, generalPolicies, corporatePolicies, bulkGroupPolicies } = req.body;
  const createdBy = req.user ? req.user.id : null;

  const newPolicy = await Policy.create({
    hotelId,
    createdBy,
    generalPolicies,
    corporatePolicies,
    bulkGroupPolicies,
    createdBy,
  }, {
    userId: createdBy,
    req: req
  });

  return newPolicy;
};

module.exports = {
  getAll: async (req, res) => {
    try {
      const policies = await Policy.findAll();
      successResponse(res, `${resourceName} fetched successfully`, policies);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, orderBy = 'DESC' } = req.query;
      const offset = (page - 1) * limit;

      const filterConfig = {
        generalPolicies: 'like',
        corporatePolicies: 'like',
        bulkGroupPolicies: 'like',
      };

      const where = buildWhereClause(req.query, filterConfig);

      const { rows: policies, count: totalRecords } = await Policy.findAndCountAll({
        where,
        offset: +offset,
        limit: +limit,
        order: [['createdAt', orderBy]],
      });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        policies,
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
      const newPolicy = await createPolicy(req, res);
      successResponse(res, `${resourceName} created successfully`, newPolicy, 201);
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const policy = await Policy.findByPk(id);

      if (!policy) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} fetched successfully`, policy);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { hotelId, generalPolicies, corporatePolicies, bulkGroupPolicies } = req.body;
      const updatedBy = req.user ? req.user.id : null;

      const policy = await Policy.findOne({ where: { hotelId } });

      const updatedData = {
        hotelId,
        updatedBy,
        generalPolicies,
        corporatePolicies,
        bulkGroupPolicies,
        updatedBy,
      };

      if (policy) {
        await policy.update(updatedData, {
          userId: updatedBy,
          req: req
        });
        successResponse(res, `${resourceName} updated successfully`, policy);
      } else {
        const newPolicy = await createPolicy(req, res);
        successResponse(res, `${resourceName} created successfully`, newPolicy, 201);
      }
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;
      
      const policy = await Policy.destroy({ 
        where: { id },
        userId: deletedBy, // Pass userId for logging
        req: req // Pass request object for additional context
      });

      if (!policy) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
