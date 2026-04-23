const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { ResturantInfo, Hotel } = require('../../db/models');
const { buildWhereClause } = require('../../helper/filter');

let resourceName = 'Restaurant Details';

const createRestaurantDetails = async (req, res) => {
    const {
        hotelId,
        breakfastCost,
        vegLunchCost,
        nonVegLunchCost,
        vegDinnerCost,
        nonVegDinnerCost,
        outsideFood,
        olaUberRapido,
        resturantMenu,
        barMenu,
        itineraryMenu,
        menuType,
        breakfastType,
        breakfastServed,
        checkInCheckOutDetails,
        driverDetails,
        guestInfo,
        resturantDetails,
        resturantNumber,
        resturantEmail,
        transportCabDetails,
        pickupPointDetails,
        hourlyCharge,
        outStationCharge,
        extraKmCharge,
        paymentLinks,
        policies,
        services,
        terms,
        numberOfCars,
        specialNote,
        carsEmailId
    } = req.body;
    const createdBy = req.user ? req.user.id : null;

    const newRestaurantDetail = await ResturantInfo.create({
        hotelId,
        createdBy,
        breakfastCost,
        vegLunchCost,
        nonVegLunchCost,
        vegDinnerCost,
        nonVegDinnerCost,
        outsideFood,
        olaUberRapido,
        resturantMenu,
        barMenu,
        itineraryMenu,
        menuType,
        breakfastType,
        breakfastServed,
        checkInCheckOutDetails,
        driverDetails,
        guestInfo,
        resturantDetails,
        resturantNumber,
        resturantEmail,
        transportCabDetails,
        pickupPointDetails,
        hourlyCharge,
        outStationCharge,
        extraKmCharge,
        paymentLinks,
        policies,
        services,
        terms,
        numberOfCars,
        specialNote,
        carsEmailId
    }, {
        userId: createdBy,
        req: req
    });

    return newRestaurantDetail;
};

module.exports = {
    getAll: async (req, res) => {
        try {
            const restaurantDetails = await ResturantInfo.findAll({
                include: [{
                    model: Hotel,
                    as: 'hotel'
                }]
            });
            successResponse(res, `${resourceName} fetched successfully`, restaurantDetails);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, orderBy = 'DESC' } = req.query;
            const offset = (page - 1) * limit;

            const filterConfig = {
                hotelId: '=',
            };

            const where = buildWhereClause(req.query, filterConfig);

            const { rows: restaurantDetails, count: totalRecords } = await ResturantInfo.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]],
                include: [{
                    model: Hotel,
                    as: 'hotel'
                }]
            });

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                restaurantDetails,
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
            const newRestaurantDetail = await createRestaurantDetails(req, res);
            successResponse(res, `${resourceName} created successfully`, newRestaurantDetail, 201);
        } catch (error) {
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const restaurantDetail = await ResturantInfo.findByPk(id, {
                include: [{
                    model: Hotel,
                    as: 'hotel'
                }]
            });

            if (!restaurantDetail) {
                return errorResponse(res, `${resourceName} not found`, {}, 200);
            }

            successResponse(res, `${resourceName} fetched successfully`, restaurantDetail);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findByHotelId: async (req, res) => {
        try {
            const { hotelId } = req.params;

            const restaurantDetail = await ResturantInfo.findOne({
                where: { hotelId: +hotelId }
            });

            if (!restaurantDetail) {
                return errorResponse(res, `${resourceName} not found for this hotel`, {}, 200);
            }

            successResponse(res, `${resourceName} fetched successfully`, restaurantDetail);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const {
                hotelId,
                breakfastCost,
                vegLunchCost,
                nonVegLunchCost,
                vegDinnerCost,
                nonVegDinnerCost,
                outsideFood,
                olaUberRapido,
                resturantMenu,
                barMenu,
                itineraryMenu,
                menuType,
                breakfastType,
                breakfastServed,
                checkInCheckOutDetails,
                driverDetails,
                guestInfo,
                resturantDetails,
                resturantNumber,
                resturantEmail,
                transportCabDetails,
                pickupPointDetails,
                hourlyCharge,
                outStationCharge,
                extraKmCharge,
                paymentLinks,
                policies,
                services,
                terms,
                numberOfCars,
                specialNote,
                carsEmailId
            } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const restaurantDetail = await ResturantInfo.findOne({ where: { hotelId } });

            const updatedData = {
                updatedBy,
                breakfastCost,
                vegLunchCost,
                nonVegLunchCost,
                vegDinnerCost,
                nonVegDinnerCost,
                outsideFood,
                olaUberRapido,
                resturantMenu,
                barMenu,
                itineraryMenu,
                menuType,
                breakfastType,
                breakfastServed,
                checkInCheckOutDetails,
                driverDetails,
                guestInfo,
                resturantDetails,
                resturantNumber,
                resturantEmail,
                transportCabDetails,
                pickupPointDetails,
                hourlyCharge,
                outStationCharge,
                extraKmCharge,
                paymentLinks,
                policies,
                services,
                terms,
                numberOfCars,
                specialNote,
                carsEmailId
            };

            if (restaurantDetail) {
                await restaurantDetail.update(updatedData, {
                    userId: updatedBy,
                    req: req
                });
                successResponse(res, `${resourceName} updated successfully`, restaurantDetail);
            } else {
                const newRestaurantDetail = await createRestaurantDetails(req, res);
                successResponse(res, `${resourceName} created successfully`, newRestaurantDetail, 201);
            }
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;

            const deleted = await ResturantInfo.destroy({
                where: { id },
                userId: deletedBy,
                req: req
            });

            if (!deleted) {
                return errorResponse(res, `${resourceName} not found`, {}, 200);
            }

            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    },
};
