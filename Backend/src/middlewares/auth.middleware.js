import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/config.js';

export const verifyJWT = asyncHandler(async (req, _, next) => {
  const token = req.cookies?.[config.AUTH_COOKIE];
  if (!token) {
    throw new ApiError(401, 'Unauthorized request');
  }
  try {
    const decodedToken = jwt.verify(token, config.JWT_SECRET);
    req.user = decodedToken;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});
