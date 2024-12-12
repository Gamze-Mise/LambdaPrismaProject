import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../../libs/prisma";
import { AppError, handleError } from "../../libs/errors";
import { formatJSONResponse } from "../../libs/apiGateway";

// Tüm bundle ürünlerini getir (pagination ve filtreleme ile)
export const getBundleProducts = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const page = Number(event.queryStringParameters?.page || "1");
    const limit = Number(event.queryStringParameters?.limit || "10");
    const bundleId = event.queryStringParameters?.bundleId;
    const productId = event.queryStringParameters?.productId;

    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {
      ...(bundleId && { bundle_id: Number(bundleId) }),
      ...(productId && { product_id: Number(productId) }),
    };

    const bundleProducts = await prisma.bundle_products.findMany({
      skip,
      take: limit,
      where,
      include: {
        products: true, // İlişkili products tablosunu getir
        product_bundles: true, // İlişkili product_bundles tablosunu getir
      },
      orderBy: {
        bp_id: "asc",
      },
    });

    const total = await prisma.bundle_products.count({ where });

    return formatJSONResponse({
      bundleProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return formatJSONResponse({ error: error.message }, error.statusCode);
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string };
      switch (prismaError.code) {
        case "P2002":
          return formatJSONResponse(
            {
              error: "This bundle product combination already exists",
            },
            400
          );
        case "P2003":
          return formatJSONResponse(
            {
              error: "Referenced bundle or product does not exist",
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

// Belirli bir bundle ürünü getir
export const getBundleProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const bpId = Number(event.pathParameters?.bpId);

    if (isNaN(bpId)) {
      throw new AppError(400, "Invalid bundle product ID");
    }

    const bundleProduct = await prisma.bundle_products.findUnique({
      where: { bp_id: bpId },
      include: {
        products: true,
        product_bundles: true,
      },
    });

    if (!bundleProduct) {
      throw new AppError(404, "Bundle product not found");
    }

    return formatJSONResponse({ bundleProduct });
  } catch (error) {
    if (error instanceof AppError) {
      return formatJSONResponse({ error: error.message }, error.statusCode);
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string };
      switch (prismaError.code) {
        case "P2002":
          return formatJSONResponse(
            {
              error: "This bundle product combination already exists",
            },
            400
          );
        case "P2003":
          return formatJSONResponse(
            {
              error: "Referenced bundle or product does not exist",
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

// Yeni bundle ürün oluştur
export const createBundleProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);
    console.log("Received data:", data); // Log gelen veriyi

    // Zorunlu alanları kontrol et
    if (!data.bundle_id || !data.product_id) {
      throw new AppError(400, "bundle_id and product_id are required");
    }

    // Foreign key kontrolü
    const bundleExists = await prisma.product_bundles.findUnique({
      where: { bundle_id: Number(data.bundle_id) },
    });

    const productExists = await prisma.products.findUnique({
      where: { product_id: Number(data.product_id) },
    });

    if (!bundleExists) {
      throw new AppError(400, "Bundle not found");
    }

    if (!productExists) {
      throw new AppError(400, "Product not found");
    }

    console.log("Attempting to create bundle product with data:", {
      bundle_id: Number(data.bundle_id),
      product_id: Number(data.product_id),
    });

    const bundleProduct = await prisma.bundle_products.create({
      data: {
        bundle_id: Number(data.bundle_id),
        product_id: Number(data.product_id),
      },
      include: {
        products: true,
        product_bundles: true,
      },
    });

    console.log("Created bundle product:", bundleProduct);

    return formatJSONResponse({ bundleProduct }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return formatJSONResponse({ error: error.message }, error.statusCode);
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string };
      switch (prismaError.code) {
        case "P2002":
          return formatJSONResponse(
            {
              error: "This bundle product combination already exists",
            },
            400
          );
        case "P2003":
          return formatJSONResponse(
            {
              error: "Referenced bundle or product does not exist",
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

// Bundle ürün güncelle
export const updateBundleProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const bpId = Number(event.pathParameters?.bpId);
    console.log("Updating bundle product with ID:", bpId);

    if (isNaN(bpId)) {
      throw new AppError(400, "Invalid bundle product ID");
    }

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);
    console.log("Update data received:", data);

    // Önce kaydın var olduğunu kontrol et
    const existingBundleProduct = await prisma.bundle_products.findUnique({
      where: { bp_id: bpId },
    });

    if (!existingBundleProduct) {
      throw new AppError(404, "Bundle product not found");
    }

    // Eğer bundle_id güncellenecekse, bunun geçerli olduğunu kontrol et
    if (data.bundle_id) {
      const bundleExists = await prisma.product_bundles.findUnique({
        where: { bundle_id: Number(data.bundle_id) },
      });

      if (!bundleExists) {
        throw new AppError(400, "Referenced bundle does not exist");
      }
    }

    // Eğer product_id güncellenecekse, bunun geçerli olduğunu kontrol et
    if (data.product_id) {
      const productExists = await prisma.products.findUnique({
        where: { product_id: Number(data.product_id) },
      });

      if (!productExists) {
        throw new AppError(400, "Referenced product does not exist");
      }
    }

    // Güncelleme verilerini hazırla
    const updateData: any = {};
    if (data.bundle_id) updateData.bundle_id = Number(data.bundle_id);
    if (data.product_id) updateData.product_id = Number(data.product_id);

    console.log("Attempting to update with data:", updateData);

    const bundleProduct = await prisma.bundle_products.update({
      where: { bp_id: bpId },
      data: updateData,
      include: {
        products: true,
        product_bundles: true,
      },
    });

    console.log("Successfully updated bundle product:", bundleProduct);

    return formatJSONResponse({
      message: "Bundle product updated successfully",
      bundleProduct,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return formatJSONResponse({ error: error.message }, error.statusCode);
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string };
      switch (prismaError.code) {
        case "P2002":
          return formatJSONResponse(
            {
              error: "This bundle product combination already exists",
            },
            400
          );
        case "P2003":
          return formatJSONResponse(
            {
              error: "Referenced bundle or product does not exist",
            },
            400
          );
        case "P2025":
          return formatJSONResponse(
            {
              error: "Bundle product not found",
            },
            404
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

// Bundle ürün sil
export const deleteBundleProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const bpId = Number(event.pathParameters?.bpId);

    if (isNaN(bpId)) {
      throw new AppError(400, "Invalid bundle product ID");
    }

    await prisma.bundle_products.delete({
      where: { bp_id: bpId },
    });

    return formatJSONResponse({
      message: "Bundle product deleted successfully",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return formatJSONResponse({ error: error.message }, error.statusCode);
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string };
      switch (prismaError.code) {
        case "P2002":
          return formatJSONResponse(
            {
              error: "This bundle product combination already exists",
            },
            400
          );
        case "P2003":
          return formatJSONResponse(
            {
              error: "Referenced bundle or product does not exist",
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
