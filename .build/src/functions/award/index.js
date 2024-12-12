"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAward = exports.updateAward = exports.createAward = exports.getSpecificAward = exports.getAward = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const errors_1 = require("../../libs/errors");
const apiGateway_1 = require("../../libs/apiGateway");
// Yardımcı fonksiyonlar
const validateIds = (userId, awardId) => {
    const parsedUserId = userId ? Number(userId) : undefined;
    const parsedAwardId = awardId ? Number(awardId) : undefined;
    if (userId && isNaN(Number(userId))) {
        throw new errors_1.AppError(400, "Invalid user ID");
    }
    if (awardId && isNaN(Number(awardId))) {
        throw new errors_1.AppError(400, "Invalid award ID");
    }
    return { parsedUserId, parsedAwardId };
};
// Tüm ödülleri getir
const getAward = async (event) => {
    try {
        const { parsedUserId } = validateIds(event.pathParameters?.userId);
        if (!parsedUserId) {
            throw new errors_1.AppError(400, "User ID is required");
        }
        console.log("Searching for userId:", parsedUserId);
        const awards = await prisma_1.default.award.findMany({
            where: { userId: parsedUserId },
        });
        console.log("Found awards:", awards);
        return (0, apiGateway_1.formatJSONResponse)({ awards });
    }
    catch (error) {
        console.error("Error in getAward:", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.getAward = getAward;
// Belirli bir ödülü getir
const getSpecificAward = async (event) => {
    try {
        const { parsedUserId, parsedAwardId } = validateIds(event.pathParameters?.userId, event.pathParameters?.awardId);
        if (!parsedUserId || !parsedAwardId) {
            throw new errors_1.AppError(400, "Both user ID and award ID are required");
        }
        console.log("Searching for userId:", parsedUserId, "awardId:", parsedAwardId);
        const award = await prisma_1.default.award.findFirst({
            where: {
                AND: [{ userId: parsedUserId }, { id: parsedAwardId }],
            },
        });
        if (!award) {
            throw new errors_1.AppError(404, "Award not found");
        }
        return (0, apiGateway_1.formatJSONResponse)({ award });
    }
    catch (error) {
        return (0, errors_1.handleError)(error);
    }
};
exports.getSpecificAward = getSpecificAward;
// Yeni ödül oluştur
const createAward = async (event) => {
    try {
        const { parsedUserId } = validateIds(event.pathParameters?.userId);
        if (!parsedUserId) {
            throw new errors_1.AppError(400, "User ID is required");
        }
        if (!event.body) {
            throw new errors_1.AppError(400, "Request body is required");
        }
        let body;
        try {
            body = JSON.parse(event.body);
        }
        catch (e) {
            throw new errors_1.AppError(400, "Invalid JSON in request body");
        }
        if (!body.subject) {
            throw new errors_1.AppError(400, "Subject is required");
        }
        const awardData = {
            userId: parsedUserId,
            subject: body.subject,
            company: body.company || null,
            date: body.date ? new Date(body.date) : null,
            lang: body.lang || null,
        };
        const award = await prisma_1.default.award.create({
            data: {
                userId: parsedUserId,
                subject: body.subject,
                company: body.company || null,
                date: body.date ? new Date(body.date) : null,
                lang: body.lang || null,
            },
        });
        return (0, apiGateway_1.formatJSONResponse)({ award }, 201);
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            return (0, apiGateway_1.formatJSONResponse)({ error: error.message }, error.statusCode);
        }
        if (typeof error === "object" && error !== null && "code" in error) {
            const prismaError = error;
            switch (prismaError.code) {
                case "P2002":
                    return (0, apiGateway_1.formatJSONResponse)({ error: "Duplicate entry" }, 400);
                case "P2003":
                    return (0, apiGateway_1.formatJSONResponse)({
                        error: "Foreign key constraint failed",
                    }, 400);
                default:
                    console.error("Unknown Prisma error:", error);
            }
        }
        return (0, apiGateway_1.formatJSONResponse)({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
        }, 500);
    }
};
exports.createAward = createAward;
// Ödül güncelle
const updateAward = async (event) => {
    try {
        const { parsedUserId, parsedAwardId } = validateIds(event.pathParameters?.userId, event.pathParameters?.awardId);
        if (!parsedUserId || !parsedAwardId) {
            throw new errors_1.AppError(400, "Both user ID and award ID are required");
        }
        if (!event.body) {
            throw new errors_1.AppError(400, "Request body is required");
        }
        const body = JSON.parse(event.body);
        const award = await prisma_1.default.award.update({
            where: {
                id: parsedAwardId,
                userId: parsedUserId,
            },
            data: {
                subject: body.subject,
                company: body.company,
                date: body.date ? new Date(body.date) : null,
                lang: body.lang,
            },
        });
        return (0, apiGateway_1.formatJSONResponse)({ award });
    }
    catch (error) {
        return (0, errors_1.handleError)(error);
    }
};
exports.updateAward = updateAward;
// Ödül sil
const deleteAward = async (event) => {
    try {
        const { parsedUserId, parsedAwardId } = validateIds(event.pathParameters?.userId, event.pathParameters?.awardId);
        if (!parsedUserId || !parsedAwardId) {
            throw new errors_1.AppError(400, "Both user ID and award ID are required");
        }
        await prisma_1.default.award.delete({
            where: {
                id: parsedAwardId,
                userId: parsedUserId,
            },
        });
        return (0, apiGateway_1.formatJSONResponse)({ message: "Award deleted successfully" });
    }
    catch (error) {
        return (0, errors_1.handleError)(error);
    }
};
exports.deleteAward = deleteAward;
