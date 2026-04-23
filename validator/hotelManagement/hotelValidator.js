const { errorResponse } = require('../../utils/responseHelper');
const { Hotel } = require('../../db/models');
const { Op } = require('sequelize');

module.exports = {
    validateHotelCreate: async (req, res, next) => {
        const { name, countryId, stateId, cityId, typeOfHotel, numberOfRooms } = req.body;

        const errors = {};

        if (!name) {
            errors.name = 'Hotel name is required';
        }

        if (!countryId) {
            errors.countryId = 'Country ID is required';
        }

        if (!stateId) {
            errors.stateId = 'State ID is required';
        }

        if (!cityId) {
            errors.cityId = 'City ID is required';
        }

        if (!typeOfHotel) {
            errors.typeOfHotel = 'Type of Hotel is required';
        }

        if (!numberOfRooms) {
            errors.numberOfRooms = 'Number of Rooms is required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validateHotelUpdate: async (req, res, next) => {
        const { name, countryId, stateId, cityId, typeOfHotel, numberOfRooms } = req.body;
        const { id } = req.params;

        const errors = {};

        if (!name) {
            errors.name = 'Hotel Name is required';
        }

        if (!countryId) {
            errors.countryId = 'Country ID is required';
        }

        if (!stateId) {
            errors.stateId = 'State ID is required';
        }

        if (!cityId) {
            errors.cityId = 'City ID is required';
        }

        if (!typeOfHotel) {
            errors.typeOfHotel = 'Type of Hotel is required';
        }

        if (!numberOfRooms) {
            errors.numberOfRooms = 'Number of Rooms is required';
        }

        const existingHotel = await Hotel.findOne({
            where: { name, id: { [Op.ne]: id } },
        });

        if (existingHotel) {
            errors.name = 'Hotel Name must be unique';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },
};
