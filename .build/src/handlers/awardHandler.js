"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAward = exports.getAwardsHandler = exports.getAwards = void 0;
const prismaService_1 = __importDefault(require("../services/prismaService"));
// Temel getAwards fonksiyonu
const getAwards = async (userId) => {
    try {
        const awards = await prismaService_1.default.award.findMany({
            where: {
                userId: userId,
            },
        });
        return awards;
    }
    catch (error) {
        console.error("Error fetching awards:", error);
        throw error;
    }
};
exports.getAwards = getAwards;
// Lambda handler fonksiyonu
const getAwardsHandler = async (event) => {
    try {
        const userId = Number(event.pathParameters?.userId);
        if (isNaN(userId)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid user ID" }),
            };
        }
        const awards = await (0, exports.getAwards)(userId);
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // CORS için
            },
            body: JSON.stringify(awards),
        };
    }
    catch (error) {
        console.error("Error in getAwardsHandler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
};
exports.getAwardsHandler = getAwardsHandler;
// Diğer CRUD işlemleri
const createAward = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const award = await prismaService_1.default.site_mdl_award.create({
            data: body,
        });
        return {
            statusCode: 201,
            body: JSON.stringify(award),
        };
    }
    catch (error) {
        console.error("Error creating award:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
};
exports.createAward = createAward;
