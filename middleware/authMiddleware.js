const { verifyToken } = require("../utils/jwtHelper");

const verifyUserToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Bearer
    if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        const userPermissions = req.user?.roleDetails?.permissions || [];
        if (userPermissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ message: 'Access Denied: Insufficient Permissions' });
        }
    };
};

module.exports = {
    verifyUserToken,
    checkPermission
};
