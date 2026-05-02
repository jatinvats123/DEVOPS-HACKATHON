import logger from "../config/logger.js";

/**
 * Middleware to log HTTP requests
 */
export const loggingMiddleware = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;
        const userAgent = req.get('user-agent') || 'unknown';

        // Log formatted message
        const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

        // Metadata for structured logging
        const meta = {
            method,
            url: originalUrl,
            status: statusCode,
            duration: `${duration}ms`,
            ip,
            userAgent,
            requestId: req.headers['x-request-id'] || 'no-id',
        };

        if (statusCode >= 500) {
            logger.error(message, meta);
        } else if (statusCode >= 400) {
            logger.warn(message, meta);
        } else {
            logger.http(message, meta);
        }
    });

    next();
};