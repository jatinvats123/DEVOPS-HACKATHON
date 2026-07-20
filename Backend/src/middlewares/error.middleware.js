import { ApiError } from "../utils/ApiError.js";
import logger from "../config/logger.js";

// Central JSON error handler. Must be registered AFTER all routes.
const errorMiddleware = (err, req, res, _next) => {
    let error = err;
    if (!(error instanceof ApiError)) {
        error = new ApiError(
            error.statusCode || 500,
            error.message || "Internal Server Error"
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
        ...(process.env.NODE_ENV === "development" ? { stack: err?.stack } : {}),
    });
};

export { errorMiddleware };
