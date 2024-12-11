import { PrismaClient } from "@prisma/client";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../services/prismaService";

// Temel getAwards fonksiyonu
export const getAwards = async (userId: number) => {
  try {
    const awards = await prisma.award.findMany({
      where: {
        userId: userId,
      },
    });
    return awards;
  } catch (error) {
    console.error("Error fetching awards:", error);
    throw error;
  }
};

// Lambda handler fonksiyonu
export const getAwardsHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = Number(event.pathParameters?.userId);

    if (isNaN(userId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid user ID" }),
      };
    }

    const awards = await getAwards(userId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // CORS için
      },
      body: JSON.stringify(awards),
    };
  } catch (error) {
    console.error("Error in getAwardsHandler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

// Diğer CRUD işlemleri
export const createAward = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");

    const award = await prisma.site_mdl_award.create({
      data: body,
    });

    return {
      statusCode: 201,
      body: JSON.stringify(award),
    };
  } catch (error) {
    console.error("Error creating award:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
