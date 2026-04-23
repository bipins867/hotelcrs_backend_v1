const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseHelper');
const { User, Role } = require('../db/models');


const SECRET_KEY = process.env.JWT_SECRET || 'yourSecretKey'; // Use environment variable for security

module.exports = {
    generateToken: (payload, expiresIn = '15d') => {
        return jwt.sign(payload, SECRET_KEY, { expiresIn });
    },

    verifyToken: async (req, res, next) => {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return errorResponse(res, `Please provide token`, '', 401);
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Token not found' });
        }

        try {
            const decoded = jwt.verify(token, SECRET_KEY);

            const user = await User.findOne({
                where: { id: decoded.id },
                include: [
                    {
                        model: Role,
                        as: 'roleDetails',
                        attributes: ['name', 'roleType', 'permissions'],
                    },
                ],
            });

            if (!user) {
                return errorResponse(res, 'Invalid or expired token', '', 401);
            }

            req.user = user.toJSON();
            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                req.expiredToken = token;
                return errorResponse(res, 'Token expired', '', 403);
            }
            return errorResponse(res, `Invalid or expired token`, '', 401);
        }
    },

    // Decode the token without verification (useful for extracting data)
    decodeToken: (token) => {
        return jwt.decode(token);
    }
};

