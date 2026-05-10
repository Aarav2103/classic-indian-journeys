import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const errorHandler = (res, statusCode, message) => {
  return res.status(statusCode).json({ message });
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return errorHandler(res, 401, 'No token provided');
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const user = await User.findById(userId);

    if (!user) {
      return errorHandler(res, 401, 'Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return errorHandler(res, 401, 'Invalid token');
  }
};

export const verifyUser = (req, res, next) => {
  if (req.user && (req.user.role === 'user' || req.user.role === 'admin')) {
    next();
  } else {
    return errorHandler(res, 403, 'Access denied');
  }
};

export const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return errorHandler(res, 403, 'Access denied');
  }
};

// Allow the resource owner (matching :id) OR any admin. Prevents the IDOR where
// any authenticated user could edit/delete another user's account.
export const verifyOwnerOrAdmin = (req, res, next) => {
  if (
    req.user &&
    (req.user._id.toString() === req.params.id || req.user.role === 'admin')
  ) {
    next();
  } else {
    return errorHandler(res, 403, 'Access denied');
  }
};

export default verifyToken;
