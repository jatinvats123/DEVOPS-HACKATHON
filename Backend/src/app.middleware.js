import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from './config/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../public/dist');

// Rate limit API traffic only — static assets (JS/CSS) must not count
// toward the quota or a single page load can throttle a real user.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

const blockUnwantedRequests = (req, res, next) => {
  const unwantedPaths = ['.env', '.git', 'wp-admin', 'phpmyadmin'];
  if (unwantedPaths.some((p) => req.url.includes(p))) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

const Middleware = (app) => {
  // Behind Render/Railway/other proxies so rate-limit + secure cookies
  // see the real client IP and protocol.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // The SPA is served from this same origin; the default CORP policy
      // would block its own assets in some browsers.
      crossOriginResourcePolicy: { policy: 'same-origin' },
    })
  );
  app.use(
    cors({
      origin: config.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(blockUnwantedRequests);
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: true, limit: '16kb' }));
  app.use(cookieParser());
  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(compression());

  app.use('/api', limiter);

  // Serve the built SPA (absolute path so it works from any cwd)
  app.use(express.static(distDir, { maxAge: '1h' }));
};

export default Middleware;
