import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const formatJSONResponse = (
  response: Record<string, unknown>,
  statusCode: number = 200
) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(response),
  };
};

export const formatErrorResponse = (error: Error, statusCode: number = 500) => {
  return formatJSONResponse(
    {
      error: statusCode === 500 ? "Internal server error" : error.message,
      details: statusCode === 500 ? error.message : undefined,
    },
    statusCode
  );
};
