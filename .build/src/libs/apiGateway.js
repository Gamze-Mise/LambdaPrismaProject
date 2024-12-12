"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorResponse = exports.formatJSONResponse = void 0;
const formatJSONResponse = (response, statusCode = 200) => {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(response),
    };
};
exports.formatJSONResponse = formatJSONResponse;
const formatErrorResponse = (error, statusCode = 500) => {
    return (0, exports.formatJSONResponse)({
        error: statusCode === 500 ? "Internal server error" : error.message,
        details: statusCode === 500 ? error.message : undefined,
    }, statusCode);
};
exports.formatErrorResponse = formatErrorResponse;
