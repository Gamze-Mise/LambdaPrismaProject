export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({ error: error.message }),
    };
  }

  console.error("Unexpected error:", error);
  return {
    statusCode: 500,
    body: JSON.stringify({ error: "Internal server error" }),
  };
};
