const { errorResponse } = require('../../utils/responseHelper');

module.exports = {
    validateCityCreate: (req, res, next) => {
        const { countryId, stateId } = req.body;

        const errors = {};

        if (!countryId) {
            errors.countryId = 'Country Id is required';
        }

        if (!stateId) {
            errors.stateId = 'State Id is required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }
        
        next();
    },
  
    validateCityUpdate: (req, res, next) => {
  
        const { countryId, stateId } = req.body;

        const errors = {};

        if (!countryId) {
            errors.countryId = 'Country Id is required';
        }

        if (!stateId) {
            errors.stateId = 'State Id is required';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }
  
        next();
    }
};
  