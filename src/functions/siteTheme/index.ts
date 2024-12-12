import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../../libs/prisma";
import { AppError, handleError } from "../../libs/errors";
import { formatJSONResponse } from "../../libs/apiGateway";

// Tüm temaları getir
export const getSiteThemes = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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

    const themes = await prisma.def_site_themes.findMany({
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

    const total = await prisma.def_site_themes.count({ where });

    return formatJSONResponse({
      themes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getSiteThemes:", error);
    return handleError(error);
  }
};

// Belirli bir temayı getir
export const getSiteTheme = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const themeId = Number(event.pathParameters?.themeId);

    if (isNaN(themeId)) {
      throw new AppError(400, "Invalid theme ID");
    }

    const theme = await prisma.def_site_themes.findUnique({
      where: { theme_id: themeId },
      include: {
        theme_details: true,
      },
    });

    if (!theme) {
      throw new AppError(404, "Theme not found");
    }

    return formatJSONResponse({ theme });
  } catch (error) {
    console.error("Error in getSiteTheme:", error);
    return handleError(error);
  }
};

// Yeni tema oluştur
export const createSiteTheme = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);
    console.log("Creating theme with data:", data);

    // theme_no kontrolü
    if (!data.theme_no) {
      throw new AppError(400, "theme_no is required");
    }

    const theme = await prisma.def_site_themes.create({
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

    return formatJSONResponse({ theme }, 201);
  } catch (error) {
    console.error("Error in createSiteTheme:", error);
    return handleError(error);
  }
};

// Tema güncelle
export const updateSiteTheme = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const themeId = Number(event.pathParameters?.themeId);

    if (isNaN(themeId)) {
      throw new AppError(400, "Invalid theme ID");
    }

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);
    console.log("Updating theme with data:", data);

    // Temanın var olduğunu kontrol et
    const existingTheme = await prisma.def_site_themes.findUnique({
      where: { theme_id: themeId },
    });

    if (!existingTheme) {
      throw new AppError(404, "Theme not found");
    }

    const theme = await prisma.def_site_themes.update({
      where: { theme_id: themeId },
      data: {
        theme_no: data.theme_no,
        is_exclusive: data.is_exclusive,
        theme_details: {
          // Detayları güncelle veya ekle
          upsert:
            data.theme_details?.map((detail: any) => ({
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

    return formatJSONResponse({ theme });
  } catch (error) {
    console.error("Error in updateSiteTheme:", error);
    return handleError(error);
  }
};

// Tema sil
export const deleteSiteTheme = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const themeId = Number(event.pathParameters?.themeId);

    if (isNaN(themeId)) {
      throw new AppError(400, "Invalid theme ID");
    }

    // Önce ilişkili detayları sil
    await prisma.theme_details.deleteMany({
      where: { theme_id: themeId },
    });

    // Sonra temayı sil
    await prisma.def_site_themes.delete({
      where: { theme_id: themeId },
    });

    return formatJSONResponse({
      message: "Theme and related details deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteSiteTheme:", error);
    return handleError(error);
  }
};
