"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSiteTheme = exports.updateSiteTheme = exports.createSiteTheme = exports.getSiteTheme = exports.getSiteThemes = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const errors_1 = require("../../libs/errors");
const apiGateway_1 = require("../../libs/apiGateway");
// Tüm temaları getir
const getSiteThemes = async (event) => {
    try {
        const page = Number(event.queryStringParameters?.page || "1");
        const limit = Number(event.queryStringParameters?.limit || "10");
        const isExclusive = event.queryStringParameters?.isExclusive;
        const themeNo = event.queryStringParameters?.themeNo;
        const skip = (page - 1) * limit;
        // Filtreleme koşulları
        const where = {
            ...(isExclusive !== undefined && {
                is_exclusive: isExclusive === "true",
            }),
            ...(themeNo && { theme_no: themeNo }),
        };
        const themes = await prisma_1.default.def_site_themes.findMany({
            skip,
            take: limit,
            where,
            include: {
                theme_details: true, // İlişkili detayları getir
            },
            orderBy: {
                theme_id: "asc",
            },
        });
        const total = await prisma_1.default.def_site_themes.count({ where });
        return (0, apiGateway_1.formatJSONResponse)({
            themes,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Error in getSiteThemes:", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.getSiteThemes = getSiteThemes;
// Belirli bir temayı getir
const getSiteTheme = async (event) => {
    try {
        const themeId = Number(event.pathParameters?.themeId);
        if (isNaN(themeId)) {
            throw new errors_1.AppError(400, "Invalid theme ID");
        }
        const theme = await prisma_1.default.def_site_themes.findUnique({
            where: { theme_id: themeId },
            include: {
                theme_details: true,
            },
        });
        if (!theme) {
            throw new errors_1.AppError(404, "Theme not found");
        }
        return (0, apiGateway_1.formatJSONResponse)({ theme });
    }
    catch (error) {
        console.error("Error in getSiteTheme:", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.getSiteTheme = getSiteTheme;
// Yeni tema oluştur
const createSiteTheme = async (event) => {
    try {
        if (!event.body) {
            throw new errors_1.AppError(400, "Request body is required");
        }
        const data = JSON.parse(event.body);
        console.log("Creating theme with data:", data);
        // theme_no kontrolü
        if (!data.theme_no) {
            throw new errors_1.AppError(400, "theme_no is required");
        }
        const theme = await prisma_1.default.def_site_themes.create({
            data: {
                theme_no: data.theme_no,
                is_exclusive: data.is_exclusive || false,
                theme_details: {
                    create: data.theme_details || [], // İsteğe bağlı detay ekleme
                },
            },
            include: {
                theme_details: true,
            },
        });
        console.log("Created theme:", theme);
        return (0, apiGateway_1.formatJSONResponse)({ theme }, 201);
    }
    catch (error) {
        console.error("Error in createSiteTheme:", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.createSiteTheme = createSiteTheme;
// Tema güncelle
const updateSiteTheme = async (event) => {
    try {
        const themeId = Number(event.pathParameters?.themeId);
        if (isNaN(themeId)) {
            throw new errors_1.AppError(400, "Invalid theme ID");
        }
        if (!event.body) {
            throw new errors_1.AppError(400, "Request body is required");
        }
        const data = JSON.parse(event.body);
        console.log("Updating theme with data:", data);
        // Temanın var olduğunu kontrol et
        const existingTheme = await prisma_1.default.def_site_themes.findUnique({
            where: { theme_id: themeId },
        });
        if (!existingTheme) {
            throw new errors_1.AppError(404, "Theme not found");
        }
        const theme = await prisma_1.default.def_site_themes.update({
            where: { theme_id: themeId },
            data: {
                theme_no: data.theme_no,
                is_exclusive: data.is_exclusive,
                theme_details: {
                    // Detayları güncelle veya ekle
                    upsert: data.theme_details?.map((detail) => ({
                        where: {
                            theme_detail_id: detail.theme_detail_id || 0,
                        },
                        create: detail,
                        update: detail,
                    })) || [],
                },
            },
            include: {
                theme_details: true,
            },
        });
        return (0, apiGateway_1.formatJSONResponse)({ theme });
    }
    catch (error) {
        console.error("Error in updateSiteTheme:", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.updateSiteTheme = updateSiteTheme;
// Tema sil
const deleteSiteTheme = async (event) => {
    try {
        const themeId = Number(event.pathParameters?.themeId);
        if (isNaN(themeId)) {
            throw new errors_1.AppError(400, "Invalid theme ID");
        }
        // Önce ilişkili detayları sil
        await prisma_1.default.theme_details.deleteMany({
            where: { theme_id: themeId },
        });
        // Sonra temayı sil
        await prisma_1.default.def_site_themes.delete({
            where: { theme_id: themeId },
        });
        return (0, apiGateway_1.formatJSONResponse)({
            message: "Theme and related details deleted successfully",
        });
    }
    catch (error) {
        console.error("Error in deleteSiteTheme:", error);
        return (0, errors_1.handleError)(error);
    }
};
exports.deleteSiteTheme = deleteSiteTheme;
