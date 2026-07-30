import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

/**
 * body-parser rejections, translated into something a person can act on.
 *
 * body-parser attaches a machine-readable `type` and sets `expose = true`, so
 * its raw message went straight to the user. A malformed body surfaced in the
 * UI as:
 *
 *     Unexpected token 'n', "null" is not valid JSON
 *
 * which describes the parser's internal state rather than the request, and sent
 * everyone looking at the value they had just typed. The underlying client bug
 * is fixed in Frontend/src/lib/api/apiRequest.js; this makes the class of
 * failure legible whoever the caller is, including third parties hitting the
 * API directly.
 */
const BODY_PARSER_ERRORS = {
  'entity.parse.failed': [400, 'Request body is not valid JSON'],
  'entity.too.large': [413, 'Request body is too large'],
  'encoding.unsupported': [415, 'Unsupported content encoding'],
  'request.aborted': [400, 'Request was aborted before it completed'],
};

// Central JSON error handler. Must be registered AFTER all routes.
const errorMiddleware = (err, req, res, _next) => {
  let error = err;

  const parserFailure = BODY_PARSER_ERRORS[err?.type];
  if (parserFailure && !(error instanceof ApiError)) {
    const [statusCode, message] = parserFailure;
    error = new ApiError(statusCode, message);
  }

  if (!(error instanceof ApiError)) {
    error = new ApiError(
      error.statusCode || 500,
      error.message || 'Internal Server Error'
    );
  }

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${error.statusCode}`, {
      message: error.message,
      stack: err?.stack,
    });
  }

  res.status(error.statusCode).json({
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.errors || [],
    // never leak stack traces outside development
    ...(process.env.NODE_ENV === 'development' ? { stack: err?.stack } : {}),
  });
};

export { errorMiddleware };
