import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../../libs/prisma";
import { AppError, handleError } from "../../libs/errors";
import { formatJSONResponse } from "../../libs/apiGateway";

// Yardımcı fonksiyonlar
const validateIds = (userId?: string, awardId?: string) => {
  const parsedUserId = userId ? Number(userId) : null;
  const parsedAwardId = awardId ? Number(awardId) : null;

  if (userId && isNaN(parsedUserId)) {
    throw new AppError(400, "Invalid user ID");
  }

  if (awardId && isNaN(parsedAwardId)) {
    throw new AppError(400, "Invalid award ID");
  }

  return { parsedUserId, parsedAwardId };
};

// Tüm ödülleri getir
export const getAward = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsedUserId } = validateIds(event.pathParameters?.userId);

    console.log("Searching for userId:", parsedUserId);

    const awards = await prisma.award.findMany({
      where: { userId: parsedUserId },
    });

    console.log("Found awards:", awards);

    return formatJSONResponse({ awards });
  } catch (error) {
    console.error("Error in getAward:", error);
    return handleError(error);
  }
};

// Belirli bir ödülü getir
export const getSpecificAward = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsedUserId, parsedAwardId } = validateIds(
      event.pathParameters?.userId,
      event.pathParameters?.awardId
    );

    console.log(
      "Searching for userId:",
      parsedUserId,
      "awardId:",
      parsedAwardId
    );

    const award = await prisma.award.findFirst({
      where: {
        AND: [{ userId: parsedUserId }, { id: parsedAwardId }],
      },
    });

    if (!award) {
      throw new AppError(404, "Award not found");
    }

    return formatJSONResponse({ award });
  } catch (error) {
    return handleError(error);
  }
};

// Yeni ödül oluştur
export const createAward = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsedUserId } = validateIds(event.pathParameters?.userId);
    console.log("Creating award for userId:", parsedUserId);

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    let body;
    try {
      body = JSON.parse(event.body);
      console.log("Parsed body:", body);
    } catch (e) {
      throw new AppError(400, "Invalid JSON in request body");
    }

    if (!body.subject) {
      throw new AppError(400, "Subject is required");
    }

    const awardData = {
      userId: parsedUserId,
      subject: body.subject,
      company: body.company || null,
      date: body.date ? new Date(body.date) : null,
      lang: body.lang || null,
    };

    console.log("Attempting to create award with data:", awardData);

    const award = await prisma.award.create({
      data: awardData,
    });

    console.log("Created award:", award);

    return formatJSONResponse({ award }, 201);
  } catch (error) {
    console.error("Detailed error in createAward:", error);

    if (error instanceof AppError) {
      return formatErrorResponse(error, error.statusCode);
    }

    // Prisma hata kodlarını kontrol et
    if (error.code) {
      console.error("Prisma error code:", error.code);
      switch (error.code) {
        case "P2002":
          return formatErrorResponse(new Error("Duplicate entry"), 400);
        case "P2003":
          return formatErrorResponse(
            new Error("Foreign key constraint failed"),
            400
          );
        default:
          console.error("Unknown Prisma error:", error);
      }
    }

    return formatErrorResponse(error as Error);
  }
};

// Ödül güncelle
export const updateAward = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsedUserId, parsedAwardId } = validateIds(
      event.pathParameters?.userId,
      event.pathParameters?.awardId
    );
    const body = JSON.parse(event.body || "{}");

    const award = await prisma.award.update({
      where: {
        id: parsedAwardId,
        userId: parsedUserId,
      },
      data: {
        subject: body.subject,
        company: body.company,
        date: body.date,
        lang: body.lang,
      },
    });

    return formatJSONResponse({ award });
  } catch (error) {
    return handleError(error);
  }
};

// Ödül sil
export const deleteAward = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { parsedUserId, parsedAwardId } = validateIds(
      event.pathParameters?.userId,
      event.pathParameters?.awardId
    );

    await prisma.award.delete({
      where: {
        id: parsedAwardId,
        userId: parsedUserId,
      },
    });

    return formatJSONResponse({ message: "Award deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
};
