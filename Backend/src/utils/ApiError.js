class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong", errors = []) {
        super(message);

        this.statusCode = statusCode;
        this.success = false;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

export { ApiError };