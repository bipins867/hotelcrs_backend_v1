const bcrypt = require('bcryptjs');
const { generateToken } = require('../../utils/jwtHelper');
const { User, Role } = require('../../db/models');
const { successResponse, errorResponse } = require('../../utils/responseHelper');

const resourceName = 'User';
const invalidCredential = 'Invalid email or password';

module.exports = {
    signUp: async (req, res) => {
        const { name, email, password } = req.body;

        // Ensure email and password are provided
        if (!name || !email || !password) {
            return errorResponse(res, 'Name, Email and password are required', null, 400);
        }

        try {
            // Check if user already exists
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return errorResponse(res, `${resourceName} email is already exists`, null, 400);
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Proceed with user creation
            const newUser = await User.create({ name, email, password: hashedPassword });
            successResponse(res, `${resourceName} created successfully`, newUser, 201);
        } catch (error) {
            errorResponse(res, `Error during ${resourceName} creation`, error.message, 500);
        }
    },

    signIn: async (req, res) => {
        const { email, password } = req.body;

        try {

            if (!email || !password) {
                return errorResponse(res, 'Email and password are required', '', 400);
            }

            const user = await User.findOne({
                where: { email },
                include: [
                    {
                        model: Role,
                        as: 'roleDetails',
                        attributes: ['name', 'roleType', 'permissions'],
                    },
                ],
            });

            if (!user) {
                return errorResponse(res, invalidCredential, 'User not found', 400);
            }

            // Compare provided password with the hashed password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return errorResponse(res, invalidCredential, invalidCredential, 400);

            }

            // Generate JWT token
            const token = generateToken({ id: user.id, email: user.email });
            const userDetails = {
                token,
                email: user.email,
                name: user.name,
                phone: user.phone,
                roleDetails: user.roleDetails,
                status: user.status,
            };

            successResponse(res, `${resourceName} login successful`, userDetails, 200);
        } catch (error) {
            errorResponse(res, `Error during ${resourceName} login`, error.message);
        }
    }
};
