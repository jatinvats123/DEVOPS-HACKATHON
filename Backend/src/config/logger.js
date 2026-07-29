import pino from 'pino';
import { getRequestContext } from '../observability/requestContext.js';

/**
 * Structured logging.
 *
 * Replaces winston. Three things drove the change:
 *
 *  - **Redaction.** Secrets reached the logs by accident before (a
 *    `console.log(req.body)` on the registration endpoint wrote plaintext
 *    passwords to stdout). Redaction needs to be a property of the logger, not
 *    a rule every call site is trusted to remember.
 *  - **Correlation.** Without a request id, a 500 in the log is an orphan —
 *    you cannot tie it to the request that caused it or to the queries it made.
 *  - **Cost.** pino serialises JSON in the worker path rather than building
 *    intermediate objects per call, which matters for a service whose scheduler
 *    logs on every check.
 *
 * The call surface (`logger.info/warn/error/debug/http`) is unchanged, so the
 * ~50 existing call sites keep working untouched.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Paths scrubbed before anything is written.
 *
 * Deliberately broad: over-redacting costs a debugging session, under-redacting
 * puts a customer credential in a log aggregator where it is retained,
 * indexed, and readable by anyone with dashboard access.
 */
const redactPaths = [
  // Credentials in request bodies
  'req.body.password',
  'req.body.newPassword',
  'req.body.oldPassword',
  'req.body.token',
  'req.body.otp',
  'req.body.authHeaders',
  '*.password',
  '*.newPassword',
  '*.oldPassword',
  // Auth material on the wire
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
  // Outbound monitor credentials and our own secrets
  '*.authHeaders',
  '*.JWT_SECRET',
  '*.SMTP_PASS',
  '*.MISTRAL_API_KEY',
  '*.CREDENTIALS_ENCRYPTION_KEY',
  '*.RENDER_API_KEY',
];

/**
 * pino has no `http` level natively and the codebase uses one. Defining it
 * between info and debug keeps the existing semantics.
 */
const customLevels = { http: 25 };

const transport =
  !isProduction && !isTest
    ? {
        // Human-readable only in local development. Production emits raw JSON
        // for the platform's log pipeline to parse — pretty-printing there
        // would make the logs harder to query, not easier to read.
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{if requestId}[{requestId}] {end}{msg}',
        },
      }
    : undefined;

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  customLevels,
  useOnlyCustomLevels: false,

  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
    // Missing paths are not an error — most log calls carry only a few of these.
    remove: false,
  },

  // Attach the current request's id to EVERY log line emitted while handling it,
  // including from code several layers deep that knows nothing about HTTP. This
  // is what makes a stack trace traceable back to a specific request.
  mixin() {
    const ctx = getRequestContext();
    return ctx?.requestId ? { requestId: ctx.requestId } : {};
  },

  formatters: {
    // `level: "info"` rather than `level: 30` — most log backends group on the
    // string, and a number means nothing to whoever is reading at 3am.
    level: (label) => ({ level: label }),
  },

  base: {
    service: 'watchtower-api',
    env: process.env.NODE_ENV || 'development',
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // Tests assert on behaviour, not log output.
  enabled: !isTest || process.env.LOG_IN_TESTS === 'true',

  transport,
});

export default logger;
