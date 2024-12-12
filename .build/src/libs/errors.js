"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
const handleError = (error) => {
    if (error instanceof AppError) {
        return {
            statusCode: error.statusCode,
            body: JSON.stringify({ error: error.message }),
        };
    }
    console.error("Unexpected error:", error);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
    };
};
exports.handleError = handleError;
