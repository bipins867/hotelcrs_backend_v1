const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { HotelChain, HotelChainContact } = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");

let resourceName = "HotelChain";

module.exports = {
  getAll: async (req, res) => {
    try {
      const filterConfig = {
        name: "like",
      };

      const where = buildWhereClause(req.query, filterConfig);
      const data = await HotelChain.findAll({
        where,
      });

      successResponse(res, `${resourceName} fetched successfully`, data);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  create: async (req, res) => {
    try {
      const {
        name,
        logo,
        description,
        hotelChainContacts,
        createdBy = req?.user?.id,
      } = req.body;

      const data = await HotelChain.create({
        name,
        logo,
        description,
        createdBy,
      }, {
        userId: createdBy,
        req: req
      });

      if (
        hotelChainContacts &&
        Array.isArray(hotelChainContacts) &&
        hotelChainContacts?.length > 0
      ) {
        const payload = hotelChainContacts.map((row) => ({
          hotelChainId: data?.id,
          type: row?.type,
          name: row.name,
          mobile: row.mobile,
          email: row.email,
          createdBy,
        }));

        await HotelChainContact.bulkCreate(payload, {
          userId: createdBy,
          req: req
        });
      }
      successResponse(res, `${resourceName} created successfully`, data, 201);
    } catch (error) {
      console.error("Error in create controller:", error.message);
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await HotelChain.findByPk(id, {
        include: [
          {
            model: HotelChainContact,
            as: "hotelChainContacts",
          },
        ],
      });

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
      const { name, logo, description, updatedBy = req?.user?.id } = req.body;

      const data = await HotelChain.findByPk(id);
      if (!data) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      const updatedData = { name, logo, description, updatedBy };
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
      
      const data = await HotelChain.destroy({ 
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
