const { errorResponse } = require('../../utils/responseHelper');

module.exports = {
    validateFICreate: async (req, res, next) => {
        const { hotelId, bankDetails, b2bCommission, b2cCommission } = req.body;

        const errors = {};

        if (!hotelId) errors.hotelId = 'Hotel id is required';

        if (!bankDetails) {
            errors.bankDetails = 'Bank Details are required';
        } else {
            if (!bankDetails.beneficiaryName) errors.beneficiaryName = 'Beneficiary Name is required';
            if (!bankDetails.bankName) errors.bankName = 'Bank Name is required';
            if (!bankDetails.accountNumber) errors.accountNumber = 'Account Number is required';
            if (!bankDetails.ifscCode) errors.ifscCode = 'IFSC Code is required';
        }

        if (!b2bCommission) errors.b2bCommission = 'B2B Commission Percentage is required';
        if (!b2cCommission) errors.b2cCommission = 'B2C Commission Percentage is required';

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },

    validateFIUpdate: async (req, res, next) => {
        const { hotelId, bankDetails, b2bCommission, b2cCommission } = req.body;

        const errors = {};

        if (!hotelId) errors.hotelId = 'Hotel id is required';

        if (bankDetails) {
            if (!bankDetails.beneficiaryName) errors.beneficiaryName = 'Beneficiary Name is required';
            if (!bankDetails.bankName) errors.bankName = 'Bank Name is required';
            if (!bankDetails.accountNumber) errors.accountNumber = 'Account Number is required';
            if (!bankDetails.ifscCode) errors.ifscCode = 'IFSC Code is required';
        }

        if (b2bCommission && isNaN(b2bCommission)) {
            errors.b2bCommission = 'B2B Commission Percentage must be a valid number';
        }

        if (b2cCommission && isNaN(b2cCommission)) {
            errors.b2cCommission = 'B2C Commission Percentage must be a valid number';
        }

        if (Object.keys(errors).length > 0) {
            return errorResponse(res, 'Validation error', errors, 400);
        }

        next();
    },
};
