import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import {
  requestContextMiddleware,
  httpLogger,
  httpMetricsMiddleware,
} from './middlewares/requestLogger.middleware.js';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { rateLimit } from 'express-rate-limit';
import { config } from './config/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../public/dist');

// General API traffic. Static assets (JS/CSS) are deliberately not counted —
// a single page load would otherwise throttle a real user.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/**
 * Credential endpoints get a far tighter budget than ordinary API traffic.
 *
 * 300 requests / 15 min is generous for a dashboard and useless as a defence
 * against credential stuffing — it permits ~20 password guesses a minute
 * indefinitely. These routes are the ones an attacker actually targets, so
 * they get their own bucket.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Successful logins should not consume the budget — a legitimate user on a
  // shared/NAT'd IP must not be locked out by their own successful activity.
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

/**
 * Password reset is rate-limited separately and by the hour: each request sends
 * a real email, so an unthrottled endpoint is both an account-enumeration
 * oracle and a way to use our SMTP reputation to spam a third party.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again later.',
  },
});

/**
 * Clear the rate-limit counters for one client key.
 *
 * Exported so a test suite can isolate cases from each other: the limiters are
 * in-memory and per-process, so without this, ten failed logins in one test
 * would leave the next test starting from a spent budget. Resetting keeps the
 * limiters ACTIVE during tests (production behaviour is what we want to
 * exercise) while making each case independent — the alternative, disabling
 * them under NODE_ENV=test, would mean never testing the real middleware stack.
 */
export function resetRateLimits(key = '::ffff:127.0.0.1') {
  for (const limiter of [apiLimiter, authLimiter, passwordResetLimiter]) {
    // Keys vary by proxy/IP representation; clearing both forms is cheap and
    // avoids a test that passes or fails based on how the socket resolved.
    limiter.resetKey(key);
    limiter.resetKey('127.0.0.1');
    limiter.resetKey('::1');
  }
}

const blockUnwantedRequests = (req, res, next) => {
  const unwantedPaths = ['.env', '.git', 'wp-admin', 'phpmyadmin'];
  if (unwantedPaths.some((p) => req.url.includes(p))) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

/**
 * Express 5 exposes `req.query` as a getter-only property. Both
 * express-mongo-sanitize and hpp work by REASSIGNING it, so on Express 5 they
 * throw "Cannot set property query of #<IncomingMessage> which has only a
 * getter" and every request 500s. (Verified against express 5.2.1 with
 * express-mongo-sanitize 2.2.0 and hpp 0.2.3.)
 *
 * Redefining it as a writable own-property restores the assignability those
 * libraries assume. The value is unchanged — this only makes the slot writable.
 */
const makeQueryWritable = (req, _res, next) => {
  Object.defineProperty(req, 'query', {
    value: req.query,
    writable: true,
    configurable: true,
  });
  next();
};

const Middleware = (app) => {
  // Behind Render/Railway/other proxies so rate-limit + secure cookies
  // see the real client IP and protocol.
  app.set('trust proxy', 1);

  // Correlation and observability run FIRST — before helmet, before CORS,
  // before the path blocklist. Every request must be traceable, including the
  // ones rejected early: a 403 with no request id is a log line nobody can tie
  // to anything.
  app.use(requestContextMiddleware);
  app.use(httpLogger);
  app.use(httpMetricsMiddleware);

  app.use(
    helmet({
      // The SPA is served from this same origin; the default CORP policy
      // would block its own assets in some browsers.
      crossOriginResourcePolicy: { policy: 'same-origin' },
    })
  );

  // Env-driven allow-list. config.js rejects "*" outright and requires at least
  // one origin in production, so there is no wildcard path to fall into.
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

  // Order matters: sanitisation must run after the body/query parsers that
  // produce the objects being sanitised, and before any route reads them.
  app.use(makeQueryWritable);
  // Strips $-prefixed and dotted keys, so a body like {"email": {"$gt": ""}}
  // cannot become a query operator and turn a login lookup into "any user".
  app.use(mongoSanitize());
  // Collapses duplicated parameters, so ?id=mine&id=yours cannot smuggle an
  // array into somewhere a single value was expected.
  app.use(hpp());

  app.use(compression());

  // Strictest limiter first — Express runs matching middleware in order, so
  // these must be registered before the general /api limiter.
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/verify', authLimiter);
  app.use('/api/auth/change-password', authLimiter);
  app.use('/api/auth/forgot-password', passwordResetLimiter);
  app.use('/api/auth/reset-password', passwordResetLimiter);
  app.use('/api', apiLimiter);

  /**
   * Serve the built SPA.
   *
   * A flat 1h max-age was wrong in both directions. Vite emits content-hashed
   * filenames (`index-CB2zv4G8.js`), so those files are immutable by
   * construction and can be cached for a year — an hour meant every returning
   * visitor re-downloaded the whole bundle. Meanwhile index.html must NOT be
   * cached at all: a stale shell references asset hashes that no longer exist
   * after a deploy, which is a blank page for anyone holding a cached copy.
   */
  app.use(
    express.static(distDir, {
      // No implicit max-age; set per file below.
      setHeaders: (res, filePath) => {
        if (/index\.html$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          return;
        }
        if (/\/assets\//.test(filePath.replace(/\\/g, '/'))) {
          // Content-hashed: a change produces a new filename, so this copy can
          // never go stale.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }
        // Everything else (favicon, robots.txt) — short, revalidated.
        res.setHeader('Cache-Control', 'public, max-age=3600');
      },
    })
  );
};

export default Middleware;
