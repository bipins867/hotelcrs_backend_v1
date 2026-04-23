const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { Room, Hotel, TaggedRatePlan, RatePlan } = require("../../db/models");
const { buildWhereClause } = require("../../helper/filter");
const { fetchAssignHotelId } = require("../common/helper");
let resourceName = "Room";

module.exports = {
  getAll: async (req, res) => {
    try {
      const { hotelId } = req.query;

      const filterConfig = {
        hotelId: "exact",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      const wherePayload = {
        hotelId,
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

      const data = await Room.findAll({
        where,
        include: [
          {
            model: TaggedRatePlan,
            as: "taggedRatePlan",
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
      const { page = 1, limit = 10, orderBy = "DESC", hotelId } = req.query;

      const offset = (page - 1) * limit;

      const filterConfig = {
        hotelId: "exact",
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      const wherePayload = {
        hotelId,
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

      const { rows: rooms, count: totalRecords } = await Room.findAndCountAll({
        where,
        include: [
          {
            model: Hotel,
            as: "hotel",
          },
        ],
        offset: +offset,
        limit: +limit,
        order: [["createdAt", orderBy]],
      });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        rooms,
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
      const { hotelId, roomDetails } = req.body;
      const createdBy = req.user ? req.user.id : null;

      const roomsToCreate = roomDetails.map((room) => ({
        hotelId,
        createdBy,
        roomName: room.roomName,
        totalRoom: room.totalRoom,
        images: room.images,
        videos: room.videos,
        youtubeUrls: room.youtubeUrls,
        area: room.area,
        roomType: room.roomType,
        roomView: room.roomView,
        smokingPreference: room.smokingPreference,
        bedType: room.bedType,
        baseAdults: room.baseAdults,
        maximumAdults: room.maximumAdults,
        numberOfMaxChildren: room.numberOfMaxChildren,
        maximumOccupancy: room.maximumOccupancy,
        status: room.status,
        description: room.description,
      }));

      const createdRooms = await Room.bulkCreate(roomsToCreate, {
        returning: true,
        userId: createdBy,
        req: req
      });

      const allTaggedRatePlans = [];

      createdRooms.forEach((createdRoom, index) => {
        const roomTaggedRatePlans = roomDetails[index].taggedRatePlan;
        if (Array.isArray(roomTaggedRatePlans)) {
          roomTaggedRatePlans.forEach((ratePlan) => {
            allTaggedRatePlans.push({
              ...ratePlan,
              roomId: createdRoom.id,
            });
          });
        }
      });

      if (allTaggedRatePlans.length > 0) {
        await TaggedRatePlan.bulkCreate(allTaggedRatePlans);
      }

      successResponse(
        res,
        `Rooms and tagged rate plans created successfully`,
        createdRooms,
        201
      );
    } catch (error) {
      errorResponse(res, `Error creating rooms`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Room.findByPk(id, {
        include: [
          {
            model: TaggedRatePlan,
            as: "taggedRatePlan",
            include: [
              {
                model: RatePlan,
                as: "ratePlan",
              },
            ],
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
      const {
        hotelId,
        roomName,
        totalRoom,
        images,
        videos,
        youtubeUrls,
        area,
        roomType,
        roomView,
        smokingPreference,
        bedType,
        baseAdults,
        maximumAdults,
        numberOfMaxChildren,
        maximumOccupancy,
        status,
        description,
        taggedRatePlan,
      } = req.body;

      const data = await Room.findByPk(id);
      if (!data) {
        return errorResponse(res, "Data not found", null, 404);
      }

      const updatedData = {
        hotelId,
        roomName,
        totalRoom,
        images,
        videos,
        youtubeUrls,
        area,
        roomType,
        roomView,
        smokingPreference,
        bedType,
        baseAdults,
        maximumAdults,
        numberOfMaxChildren,
        maximumOccupancy,
        status,
        description,
      };

      const updatedBy = req.user ? req.user.id : null;

      await data.update(updatedData, {
        userId: updatedBy,
        req: req
      });

      if (taggedRatePlan && Array.isArray(taggedRatePlan)) {
        await TaggedRatePlan.destroy({
          where: { roomId: id },
        });

        const taggedRoomLists = taggedRatePlan?.map((row) => ({
          ...row,
          roomId: data.id,
        }));
        await TaggedRatePlan.bulkCreate(taggedRoomLists);
      }

      successResponse(res, `${resourceName} updated successfully`, data);
    } catch (error) {
      errorResponse(res, `Error updating ${resourceName}`, error.message);
    }
  },

  upsert: async (req, res) => {
    try {
      const { hotelId, roomDetails } = req.body;
      const createdBy = req.user ? req.user.id : null;

      const responseRooms = [];

      for (const room of roomDetails) {
        let roomRecord;

        if (room.id) {
          await Room.update(
            {
              hotelId,
              updatedBy: createdBy,
              roomName: room.roomName,
              totalRoom: room.totalRoom,
              images: room.images,
              videos: room.videos,
              youtubeUrls: room.youtubeUrls,
              area: room.area,
              roomType: room.roomType,
              roomView: room.roomView,
              smokingPreference: room.smokingPreference,
              bedType: room.bedType,
              baseAdults: room.baseAdults,
              maximumAdults: room.maximumAdults,
              numberOfMaxChildren: room.numberOfMaxChildren,
              maximumOccupancy: room.maximumOccupancy,
              status: room.status,
              description: room.description,
            },
            {
              where: { id: room.id },
              userId: createdBy,
              req: req
            }
          );
          roomRecord = await Room.findByPk(room.id);
        } else {
          roomRecord = await Room.create({
            hotelId,
            createdBy,
            roomName: room.roomName,
            totalRoom: room.totalRoom,
            images: room.images,
            videos: room.videos,
            youtubeUrls: room.youtubeUrls,
            area: room.area,
            roomType: room.roomType,
            roomView: room.roomView,
            smokingPreference: room.smokingPreference,
            bedType: room.bedType,
            baseAdults: room.baseAdults,
            maximumAdults: room.maximumAdults,
            numberOfMaxChildren: room.numberOfMaxChildren,
            maximumOccupancy: room.maximumOccupancy,
            status: room.status,
            description: room.description,
          }, {
            userId: createdBy,
            req: req
          });
        }

        if (Array.isArray(room.taggedRatePlan)) {
          for (const ratePlan of room.taggedRatePlan) {
            if (ratePlan.id) {
              await TaggedRatePlan.update(
                {
                  ...ratePlan,
                  roomId: roomRecord.id,
                },
                { where: { id: ratePlan.id } }
              );
            } else {
              await TaggedRatePlan.create({
                ...ratePlan,
                roomId: roomRecord.id,
              });
            }
          }
        }

        responseRooms.push(roomRecord);
      }

      successResponse(
        res,
        `Rooms and tagged rate plans processed successfully`,
        responseRooms,
        200
      );
    } catch (error) {
      errorResponse(res, `Error processing rooms`, error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user ? req.user.id : null;

      const data = await Room.destroy({
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
