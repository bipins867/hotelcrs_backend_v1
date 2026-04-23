const { errorResponse } = require('../../utils/responseHelper');

module.exports = {
    validateHotelDetailCreate: async (req, res, next) => {
        const { hotelId, starRating, numberOfBuildings, numberOfFloors, status } = req.body;

        const errors = {};

        if (!hotelId) {
            errors.hotelId = 'hotel Id is required';
        }

        if (!starRating || ![1, 2, 3, 4, 5].includes(Number(starRating))) {
            errors.starRating = 'Star Rating is required and must be between 1 and 5.';
        }

        if (!numberOfBuildings || isNaN(numberOfBuildings) || numberOfBuildings < 1) {
            errors.numberOfBuildings = 'Number of Buildings is required and must be a positive integer.';
        }

        if (!numberOfFloors || isNaN(numberOfFloors) || numberOfFloors < 1) {
            errors.numberOfFloors = 'Number of Floors is required and must be a positive integer.';
        }

        if (typeof status === 'undefined' || ![0, 1].includes(Number(status))) {
            errors.status = 'Status is required and must be 0 (Inactive) or 1 (Active).';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validateHotelDetailUpdate: async (req, res, next) => {
        const { hotelId, starRating, numberOfBuildings, numberOfFloors, status } = req.body;

        const errors = {};

        if (!hotelId) {
            errors.hotelId = 'hotel Id is required';
        }

        if (starRating && ![1, 2, 3, 4, 5].includes(Number(starRating))) {
            errors.starRating = 'Star Rating must be between 1 and 5.';
        }

        if (numberOfBuildings && (isNaN(numberOfBuildings) || numberOfBuildings < 1)) {
            errors.numberOfBuildings = 'Number of Buildings must be a positive integer.';
        }

        if (numberOfFloors && (isNaN(numberOfFloors) || numberOfFloors < 1)) {
            errors.numberOfFloors = 'Number of Floors must be a positive integer.';
        }

        if (typeof status !== 'undefined' && ![0, 1].includes(Number(status))) {
            errors.status = 'Status must be 0 (Inactive) or 1 (Active).';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },
};
