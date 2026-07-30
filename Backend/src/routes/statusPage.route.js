import express from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  listStatusPages,
  createStatusPage,
  updateStatusPage,
  deleteStatusPage,
  getPublicStatusPage,
} from '../controllers/statusPage.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

/** Management API — every route owner-scoped behind authentication. */
export const StatusPageRouter = express.Router();

StatusPageRouter.get('/', verifyJWT, listStatusPages);
StatusPageRouter.post('/', verifyJWT, createStatusPage);
StatusPageRouter.patch('/:pageId', verifyJWT, updateStatusPage);
StatusPageRouter.delete('/:pageId', verifyJWT, deleteStatusPage);

/**
 * Public read API — no authentication at all.
 *
 * Its own limiter, and a tighter one than the authenticated API: this is the
 * only endpoint in the product an anonymous caller can reach, every hit runs
 * three aggregations per monitor on the logs collection, and the slug namespace
 * is enumerable. Sharing the general /api bucket would let unauthenticated
 * traffic exhaust the budget that signed-in users depend on.
 *
 * The limit is per IP and generous enough for a real incident, when a status
 * page gets more traffic than at any other time — which is exactly when
 * throttling it would be worst.
 */
const publicStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again shortly.',
  },
});

export const PublicStatusRouter = express.Router();

PublicStatusRouter.get('/:slug', publicStatusLimiter, getPublicStatusPage);

export default StatusPageRouter;
