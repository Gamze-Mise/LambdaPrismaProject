import { formatJSONResponse } from "./apiGateway";

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export const handleError = (error: unknown) => {
  console.error("Error details:", error);

  if (error instanceof AppError) {
    return formatJSONResponse({ error: error.message }, error.statusCode);
  }

  // Prisma hataları için özel işleme
  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaError = error as { code: string; meta?: any };
    console.error("Prisma error:", prismaError);

    switch (prismaError.code) {
      case "P2002":
        return formatJSONResponse(
          {
            error: "Duplicate entry found",
            details: prismaError.meta?.target,
          },
          400
        );
      case "P2003":
        return formatJSONResponse(
          {
            error: "Referenced record not found",
            details: prismaError.meta?.field_name,
          },
          400
        );
      case "P2025":
        return formatJSONResponse(
          {
            error: "Record not found",
            details: prismaError.meta?.cause,
          },
          404
        );
      default:
        console.error("Unknown Prisma error code:", prismaError.code);
    }
  }

  // Diğer hatalar için
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred";
  console.error("General error:", errorMessage);

  return formatJSONResponse(
    {
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
    },
    500
  );
};
