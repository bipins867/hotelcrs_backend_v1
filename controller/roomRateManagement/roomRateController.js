const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHelper");
const { RoomRate, AdultRate, Restriction, sequelize } = require("../../db/models");
const { Op, Sequelize } = require("sequelize");
const { buildWhereClause } = require("../../helper/filter");
const { getDateRange, chunkDateRange } = require("../../helper");
const { fetchAssignHotelId } = require("../common/helper");

let resourceName = "Room rate";

module.exports = {
  getAll: async (req, res) => {
    try {
      const {
        hotelId,
        roomId,
        ratePlanId,
        idate,
        totalAdults,
        isReservation = false,
        totalDays,
        contractType
      } = req.query;
      let where;

      const filterConfig = {
        hotelId: "exact",
        roomId: "exact",
        ratePlanId: "exact",
        idate: "range",
        contractType: "exact"
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

      if (assignHotelId) {
        if (hotelId) {
          if (!assignHotelId.includes(Number(hotelId))) {
            return errorResponse(res, `You are not authorized to access this hotel.`, [], 400);
          }
        }
      }

      if (isReservation) {
        const [startDate, endDate] = idate.split(",");

        const generateDateArray = (start, end) => {
          const dateArray = [];
          let current = new Date(start);
          const last = new Date(end);
          let index = 1;
          while (current <= last && index <= totalDays) {
            dateArray.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
            index++;
          }
          return dateArray;
        };

        const expectedDates = generateDateArray(startDate, endDate);
        const checkinDate = expectedDates[0];
        const checkoutDate = expectedDates[expectedDates.length - 1];

        where = buildWhereClause(
          { hotelId, roomId, ratePlanId, idate: [checkinDate, checkoutDate].toString(), contractType },
          filterConfig
        );

        const actualDatesData = await RoomRate.findAll({
          attributes: [
            [Sequelize.fn("DISTINCT", Sequelize.col("idate")), "idate"],
          ],
          where,
          raw: true,
        });

        const actualDates = actualDatesData.map((d) => d.idate);

        const missingDates = expectedDates.filter(
          (date) => !actualDates.includes(date)
        );

        if (missingDates.length > 0) {
          return successResponse(res, `Tariff is not available.`, [], 200);
        }
      } else {
        where = buildWhereClause(
          { hotelId, roomId, ratePlanId, idate, contractType },
          filterConfig
        );
      }

      const roomRates = await RoomRate.findAll({
        where,
        include: [
          {
            model: AdultRate,
            as: "adultRates",
            where: totalAdults ? { adult: Number(totalAdults) } : undefined,
          },
        ],
      });

      successResponse(res, `${resourceName} fetched successfully`, roomRates);
    } catch (error) {
      console.log("error", error);
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  findAndCountAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, orderBy = "DESC" } = req.query;

      const offset = (page - 1) * limit;

      const filterConfig = {
        hotelId: "exact",
        roomId: "exact",
        ratePlanId: "exact",
      };

      const wherePayload = {
        hotelId,
        roomId,
        ratePlanId,
      };

      const assignHotelId = fetchAssignHotelId(req?.user);

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

      const { rows: roomRates, count: totalRecords } =
        await RoomRate.findAndCountAll({
          where,
          offset: +offset,
          limit: +limit,
          order: [["createdAt", orderBy]],
          include: [
            { model: AdultRate, as: "adultRates" },
            { model: Restriction, as: "restriction" },
          ],
        });

      const totalPages = Math.ceil(totalRecords / limit);

      successResponse(res, `${resourceName} fetched successfully`, {
        roomRates,
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
        hotelId,
        roomId,
        ratePlanId,
        restrictionsId,
        contractType,
        idate,
        available,
        paidChildFiveToTwelve,
        extraAdultAmount,
        adultRates,
        restriction,
      } = req.body;
      const createdBy = req.user ? req.user.id : null;

      const newHotel = await RoomRate.create({
        hotelId,
        roomId,
        ratePlanId,
        contractType,
        idate,
        available,
        paidChildFiveToTwelve,
        extraAdultAmount,
        createdBy,
      }, {
        userId: createdBy,
        req: req
      });

      await newHotel.save();

      // Update adultRates
      if (Array.isArray(adultRates) && adultRates.length > 0) {
        await AdultRate.destroy({ where: { rateId: newHotel.id } });

        const adultRatesData = adultRates.map((rate) => ({
          ...rate,
          rateId: newHotel.id,
        }));
        await AdultRate.bulkCreate(adultRatesData);
      }

      // Update restriction
      if (restriction) {
        const existingRestriction = await Restriction.findOne({
          where: { rateId: newHotel.id },
        });

        if (existingRestriction) {
          await existingRestriction.update(restriction);
        } else {
          await Restriction.create({
            ...restriction,
            rateId: newHotel.id,
          });
        }
      }

      successResponse(res, `${resourceName} add successfully`, newHotel);
    } catch (error) {
      errorResponse(res, `Error adding ${resourceName}`, error.message);
    }
  },

  findById: async (req, res) => {
    try {
      const { id } = req.params;

      const roomRate = await RoomRate.findOne({
        where: { id },
        include: [
          { model: AdultRate, as: "adultRates" },
          { model: Restriction, as: "restriction" },
        ],
      });

      if (!roomRate) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      successResponse(res, `${resourceName} fetched successfully`, roomRate);
    } catch (error) {
      errorResponse(res, `Error fetching ${resourceName}`, error.message);
    }
  },

  update: async (req, res) => {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const {
        hotelId,
        roomId,
        ratePlanId,
        contractType,
        idate,
        available,
        paidChildFiveToTwelve,
        extraAdultAmount,
        adultRates,
        restriction,
      } = req.body;

      const updatedBy = req.user?.id || null;

      // 1️⃣ Find RoomRate
      const roomRate = await RoomRate.findOne({ where: { id }, transaction: t });

      if (!roomRate) {
        await t.rollback();
        return errorResponse(res, "RoomRate not found", null, 404);
      }

      // 2️⃣ Update RoomRate fields
      await roomRate.update(
        {
          hotelId: hotelId ?? roomRate.hotelId,
          roomId: roomId ?? roomRate.roomId,
          ratePlanId: ratePlanId ?? roomRate.ratePlanId,
          contractType: contractType ?? roomRate.contractType,
          idate: idate ?? roomRate.idate,
          available: available ?? roomRate.available,
          paidChildFiveToTwelve:
            paidChildFiveToTwelve ?? roomRate.paidChildFiveToTwelve,
          extraAdultAmount: extraAdultAmount ?? roomRate.extraAdultAmount,
          updatedBy: updatedBy ?? roomRate.updatedBy,
        },
        { transaction: t }
      );

      // 3️⃣ AdultRates UPSERT like bulk updateRates
      if (Array.isArray(adultRates) && adultRates.length) {
        // Fetch existing AdultRates
        const existingAdultRates = await AdultRate.findAll({
          where: { rateId: roomRate.id },
          transaction: t,
        });

        const existingMap = new Map();
        existingAdultRates.forEach((ar) => {
          existingMap.set(ar.adult, ar);
        });

        const toUpdate = [];
        const toCreate = [];
        const incomingAdultsSet = new Set();

        for (const ar of adultRates) {
          incomingAdultsSet.add(ar.adult);
          if (existingMap.has(ar.adult)) {
            // Update existing
            toUpdate.push({
              id: existingMap.get(ar.adult).id,
              amount: Number(ar.amount || 0),
              updatedBy,
            });
          } else {
            // Create new
            toCreate.push({
              rateId: roomRate.id,
              adult: ar.adult,
              amount: Number(ar.amount || 0),
              createdBy: updatedBy,
              updatedBy,
            });
          }
        }

        // Update existing AdultRates
        for (const u of toUpdate) {
          await AdultRate.update(
            { amount: u.amount, updatedBy: u.updatedBy },
            { where: { id: u.id }, transaction: t }
          );
        }

        // Create new AdultRates
        if (toCreate.length) {
          await AdultRate.bulkCreate(toCreate, { transaction: t });
        }

        // Delete AdultRates that are no longer in payload
        const deleteIds = existingAdultRates
          .filter((ar) => !incomingAdultsSet.has(ar.adult))
          .map((ar) => ar.id);

        if (deleteIds.length) {
          await AdultRate.destroy({ where: { id: deleteIds }, transaction: t });
        }
      }

      // 4️⃣ Update or create Restriction
      if (restriction) {
        const existingRestriction = await Restriction.findOne({
          where: { rateId: roomRate.id },
          transaction: t,
        });

        if (existingRestriction) {
          await existingRestriction.update(restriction, { transaction: t });
        } else {
          await Restriction.create(
            { ...restriction, rateId: roomRate.id },
            { transaction: t }
          );
        }
      }

      await t.commit();

      // 5️⃣ Re-fetch updated RoomRate with associations
      const updatedRoomRate = await RoomRate.findOne({
        where: { id: roomRate.id },
        include: [
          { model: AdultRate, as: "adultRates" },
          { model: Restriction, as: "restriction" },
        ],
      });

      return successResponse(res, "RoomRate updated successfully", updatedRoomRate);
    } catch (error) {
      await t.rollback();
      console.error("Error updating RoomRate:", error);
      return errorResponse(res, "Error updating RoomRate", error.message);
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const roomRate = await RoomRate.findByPk(id);
      if (!roomRate) {
        return errorResponse(res, `${resourceName} not found`, null, 404);
      }

      // Delete related adultRates and restrictions
      await AdultRate.destroy({ where: { rateId: roomRate.id } });
      await Restriction.destroy({ where: { rateId: roomRate.id } });

      const deletedBy = req.user ? req.user.id : null;

      // Finally, delete the roomRate
      await roomRate.destroy({
        userId: deletedBy,
        req: req
      });

      successResponse(res, `${resourceName} deleted successfully`);
    } catch (error) {
      errorResponse(res, `Error deleting ${resourceName}`, error.message);
    }
  },

  createInventory: async (req, res) => {
    const { startDate, endDate, data, contractType } = req.body;
    const userId = req.user?.id || null;

    if (!startDate || !endDate || !Array.isArray(data) || !data.length) {
      return errorResponse(res, "Invalid input", null, 400);
    }

    const INVENTORY_CHUNK_DAYS = 30;
    const dateChunks = chunkDateRange(startDate, endDate, INVENTORY_CHUNK_DAYS);

    try {
      for (const [chunkStart, chunkEnd] of dateChunks) {
        const dates = getDateRange(chunkStart, chunkEnd);

        const values = [];

        for (const row of data) {
          for (const idate of dates) {
            values.push([
              row.hotelId,
              row.roomId,
              row.ratePlanId,
              idate,
              contractType,
              row.available,
              userId,
              userId,
            ]);
          }
        }

        if (!values.length) continue;

        const sql = `
        INSERT INTO "RoomRates"
          ("hotelId", "roomId", "ratePlanId", "idate", "contractType",
           "available", "createdBy", "updatedBy", "createdAt", "updatedAt")
        VALUES
          ${values
            .map(
              (_, i) =>
                `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4},
                  $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8},
                  NOW(), NOW())`
            )
            .join(",")}
        ON CONFLICT ("hotelId", "roomId", "ratePlanId", "idate", "contractType")
        WHERE "deletedAt" IS NULL
        DO UPDATE SET
          "available" = EXCLUDED."available",
          "updatedBy" = EXCLUDED."updatedBy",
          "updatedAt" = NOW();
      `;

        await sequelize.query(sql, {
          bind: values.flat(),
          type: sequelize.QueryTypes.INSERT,
        });
      }

      return successResponse(
        res,
        "Inventory created/updated successfully",
        null,
        201
      );
    } catch (error) {
      console.error("Error in createInventory:", error);
      return errorResponse(
        res,
        "Error creating/updating inventory",
        error.message
      );
    }
  },

  updateRates: async (req, res) => {
    const { contract, startDate, endDate, hotelId, data } = req.body;
    const userId = req.user?.id || null;

    if (!startDate || !endDate || !hotelId || !data?.length) {
      return errorResponse(res, "Invalid request payload", null, 400);
    }

    const DATE_CHUNK_SIZE = 30;
    const dateChunks = chunkDateRange(startDate, endDate, DATE_CHUNK_SIZE);

    try {
      for (const [chunkStart, chunkEnd] of dateChunks) {
        const dates = getDateRange(chunkStart, chunkEnd);

        /* --------------------------------------------
           1. Build RoomRate UPSERT values
        -------------------------------------------- */
        const roomRateValues = [];

        for (const room of data) {
          for (const rp of room.ratePlan) {
            for (const date of dates) {
              roomRateValues.push([
                hotelId,
                rp.roomId,
                rp.ratePlanId,
                date,
                contract,
                Number(rp.paidChildFiveToTwelve || 0),
                Number(rp.extraAdultAmount || 0),
                0, // available
                userId,
                userId,
              ]);
            }
          }
        }

        if (roomRateValues.length) {
          /* --------------------------------------------
             2. Raw SQL UPSERT for RoomRates (partial unique index)
          -------------------------------------------- */
          const sql = `
          INSERT INTO "RoomRates"
            ("hotelId","roomId","ratePlanId","idate","contractType",
             "paidChildFiveToTwelve","extraAdultAmount","available",
             "createdBy","updatedBy","createdAt","updatedAt")
          VALUES
            ${roomRateValues
              .map(
                (_, i) =>
                  `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10}, NOW(), NOW())`
              )
              .join(",")}
          ON CONFLICT ("hotelId","roomId","ratePlanId","idate","contractType")
          WHERE "deletedAt" IS NULL
          DO UPDATE SET
            "paidChildFiveToTwelve" = EXCLUDED."paidChildFiveToTwelve",
            "extraAdultAmount" = EXCLUDED."extraAdultAmount",
            "updatedBy" = EXCLUDED."updatedBy",
            "updatedAt" = NOW();
        `;

          await sequelize.query(sql, {
            bind: roomRateValues.flat(),
            type: sequelize.QueryTypes.INSERT,
          });
        }

        /* --------------------------------------------
           3. Fetch updated RoomRates for AdultRates
        -------------------------------------------- */
        const updatedRoomRates = await RoomRate.findAll({
          where: {
            hotelId,
            contractType: contract,
            idate: { [Op.between]: [dates[0], dates[dates.length - 1]] },
          },
          attributes: ["id", "roomId", "ratePlanId"],
        });

        /* --------------------------------------------
           4. Build AdultRate UPSERT rows
        -------------------------------------------- */
        const adultRateUpserts = [];
        const incomingKeySet = new Set();

        const ratePlanMap = new Map();
        for (const room of data) {
          for (const rp of room.ratePlan) {
            ratePlanMap.set(`${rp.roomId}_${rp.ratePlanId}`, rp.adultRates);
          }
        }

        for (const rr of updatedRoomRates) {
          const adultRates = ratePlanMap.get(`${rr.roomId}_${rr.ratePlanId}`);
          if (!adultRates) continue;

          for (const ar of adultRates) {
            const key = `${rr.id}_${ar.adult}`;
            incomingKeySet.add(key);

            adultRateUpserts.push({
              rateId: rr.id,
              adult: ar.adult,
              amount: Number(ar.amount || 0),
              updatedBy: userId,
              createdBy: userId,
            });
          }
        }

        /* --------------------------------------------
           5. AdultRate UPSERT
        -------------------------------------------- */
        if (adultRateUpserts.length) {
          await AdultRate.bulkCreate(adultRateUpserts, {
            updateOnDuplicate: ["amount", "updatedBy", "updatedAt"],
          });
        }

        /* --------------------------------------------
           6. OPTIONAL: delete missing AdultRates
        -------------------------------------------- */
        const existingRoomRates = await RoomRate.findAll({
          where: {
            hotelId,
            contractType: contract,
            idate: { [Op.between]: [dates[0], dates[dates.length - 1]] },
          },
          include: [
            {
              model: AdultRate,
              as: "adultRates",
              attributes: ["id", "adult"],
            },
          ],
        });

        const deleteIds = [];
        for (const rr of existingRoomRates) {
          for (const ar of rr.adultRates || []) {
            const key = `${rr.id}_${ar.adult}`;
            if (!incomingKeySet.has(key)) {
              deleteIds.push(ar.id);
            }
          }
        }

        if (deleteIds.length) {
          await AdultRate.destroy({
            where: { id: deleteIds },
          });
        }
      }

      return successResponse(res, "Room Rates updated successfully", null);
    } catch (err) {
      console.error("Error in updateRates:", err);
      return errorResponse(res, "Error updating Room Rates", err.message);
    }
  },

  updateRestrictions: async (req, res) => {
    try {
      const { startDate, endDate, hotelId, contractType, restrictions } = req.body;
      const dateRangeFormat = getDateRange(startDate, endDate);

      if (!dateRangeFormat?.length) {
        return errorResponse(res, "Invalid date range", null, 400);
      }

      const updatePromises = [];

      const roomRates = await RoomRate.findAll({
        where: {
          hotelId,
          idate: {
            [Op.between]: [
              dateRangeFormat[0],
              dateRangeFormat[dateRangeFormat.length - 1],
            ],
          },
        },
        include: [{ model: Restriction, as: "restriction" }],
      });

      for (const roomRate of roomRates) {
        if (roomRate.restriction) {
          const updateData = {};
          Object.keys(restrictions).forEach((key) => {
            if (restrictions[key] !== undefined) {
              updateData[key] = restrictions[key];
            }
          });

          updatePromises.push(
            roomRate.restriction.update({
              ...updateData,
              updatedBy: req.user?.id,
            })
          );
        } else {
          updatePromises.push(
            Restriction.create({
              ...restrictions,
              rateId: roomRate.id,
              createdBy: req.user?.id,
              updatedBy: req.user?.id,
              contractType
            })
          );
        }
      }

      await Promise.all(updatePromises);
      successResponse(
        res,
        `${resourceName} restrictions updated successfully`,
        null
      );
    } catch (error) {
      errorResponse(
        res,
        `Error updating ${resourceName} restrictions`,
        error.message
      );
    }
  },
};
