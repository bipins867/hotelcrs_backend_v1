const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { HotelTeam } = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");

let resourceName = "Team";

module.exports = {
  getAll: async (req, res) => {
    try {
      const teams = await HotelTeam.findAll();
      successResponse(res, `${resourceName} fetched successfully`, teams);
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
        designation: "like",
        phone: "like",
        mobile: "like",
        email: "like",
      };

      const where = buildWhereClause(req.query, filterConfig);

      const { rows: hotelTeams, count: totalRecords } =
        await HotelTeam.findAndCountAll({
          where,
          offset: +offset,
          limit: +limit,
          order: [["createdAt", orderBy]],
        });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        hotelTeams,
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
      const { hotelId, teamMembers } = req.body;
      const createdBy = req.user ? req.user.id : null;

      const teamData = teamMembers.map((member) => ({
        hotelId,
        createdBy,
        designation: member.designation,
        name: member.name,
        phone: member.phone,
        mobile: member.mobile,
        email: member.email,
      }));

      const newTeams = await HotelTeam.bulkCreate(teamData, {
        userId: createdBy,
        req: req
      });

      successResponse(
        res,
        `${resourceName} created successfully`,
        newTeams,
        201
      );
    } catch (error) {
      errorResponse(res, `Error creating ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const team = await HotelTeam.findByPk(id);

      if (!team) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} fetched successfully`, team);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    try {
      const { hotelId, teamMembers } = req.body;
      const updatedBy = req.user ? req.user.id : null;

      // Fetch all existing team members for the given hotel
      const existingTeamMembers = await HotelTeam.findAll({
        where: { hotelId },
      });

      // Extract IDs from the request payload and existing team members
      const reqIds = teamMembers.map((member) => member.id).filter(Boolean);
      const existingIds = existingTeamMembers.map((member) => member.id);

      // Update or create rows based on request data
      for (const member of teamMembers) {
        const { id, name, designation, phone, mobile, email } = member;

        if (id && existingIds.includes(id)) {
          // Update existing member
          const existingMember = existingTeamMembers.find((m) => m.id === id);
          await existingMember.update({
            name,
            designation,
            phone,
            mobile,
            email,
            updatedBy,
          }, {
            userId: updatedBy,
            req: req
          });
        } else {
          // Create new member
          await HotelTeam.create({
            hotelId,
            name,
            designation,
            phone,
            mobile,
            email,
            createdBy: updatedBy,
          }, {
            userId: updatedBy,
            req: req
          });
        }
      }
      // Delete rows not included in the request
      const rowsToDelete = existingTeamMembers.filter(
        (member) => !reqIds.includes(member.id)
      );
      for (const row of rowsToDelete) {
        const deletedBy = req.user ? req.user.id : null;
        
        await row.destroy({
          userId: deletedBy,
          req: req
        });
      }

      successResponse(res, `${resourceName} updated successfully`, {
        hotelId,
        teamMembers,
      });
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;
      
      const team = await HotelTeam.destroy({ 
        where: { id },
        userId: deletedBy,
        req: req
      });

      if (!team) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },
};
