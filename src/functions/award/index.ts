import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../../libs/prisma";
import { AppError, handleError } from "../../libs/errors";
import { formatJSONResponse } from "../../libs/apiGateway";

// Yardımcı fonksiyonlar
const validateIds = (userId?: string, awardId?: string) => {
  const parsedUserId = userId ? Number(userId) : undefined;
  const parsedAwardId = awardId ? Number(awardId) : undefined;

  if (userId && isNaN(Number(userId))) {
    throw new AppError(400, "Invalid user ID");
  }

  if (awardId && isNaN(Number(awardId))) {
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

    if (!parsedUserId) {
      throw new AppError(400, "User ID is required");
    }

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

    if (!parsedUserId || !parsedAwardId) {
      throw new AppError(400, "Both user ID and award ID are required");
    }

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

    if (!parsedUserId) {
      throw new AppError(400, "User ID is required");
    }

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    let body;
    try {
      body = JSON.parse(event.body);
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

    const award = await prisma.award.create({
      data: {
        userId: parsedUserId,
        subject: body.subject,
        company: body.company || null,
        date: body.date ? new Date(body.date) : null,
        lang: body.lang || null,
      },
    });

    return formatJSONResponse({ award }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return formatJSONResponse({ error: error.message }, error.statusCode);
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string };
      switch (prismaError.code) {
        case "P2002":
          return formatJSONResponse({ error: "Duplicate entry" }, 400);
        case "P2003":
          return formatJSONResponse(
            {
              error: "Foreign key constraint failed",
            },
            400
          );
        default:
          console.error("Unknown Prisma error:", error);
      }
    }

    return formatJSONResponse(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
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

    if (!parsedUserId || !parsedAwardId) {
      throw new AppError(400, "Both user ID and award ID are required");
    }

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const body = JSON.parse(event.body);

    const award = await prisma.award.update({
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

    if (!parsedUserId || !parsedAwardId) {
      throw new AppError(400, "Both user ID and award ID are required");
    }

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
