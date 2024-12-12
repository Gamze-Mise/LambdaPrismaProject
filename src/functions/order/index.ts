import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../../libs/prisma";
import { AppError, handleError } from "../../libs/errors";
import { formatJSONResponse } from "../../libs/apiGateway";

// Tüm siparişleri getir (filtreleme ve pagination ile)
export const getOrders = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const page = Number(event.queryStringParameters?.page || "1");
    const limit = Number(event.queryStringParameters?.limit || "10");
    const userId = event.queryStringParameters?.userId;
    const orderStatus = event.queryStringParameters?.orderStatus as any;
    const orderNo = event.queryStringParameters?.orderNo;

    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {
      ...(userId && { user_id: Number(userId) }),
      ...(orderStatus && { order_status: orderStatus }),
      ...(orderNo && { order_no: orderNo }),
    };

    const orders = await prisma.orders.findMany({
      skip,
      take: limit,
      where,
      include: {
        users: true,
        order_details: {
          include: {
            products: true,
            products_pricing: true,
          },
        },
        invoices: true,
      },
      orderBy: {
        order_date: "desc",
      },
    });

    const total = await prisma.orders.count({ where });

    return formatJSONResponse({
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getOrders:", error);
    return handleError(error);
  }
};

// Belirli bir siparişi getir
export const getOrder = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const orderId = Number(event.pathParameters?.orderId);

    if (isNaN(orderId)) {
      throw new AppError(400, "Invalid order ID");
    }

    const order = await prisma.orders.findUnique({
      where: { order_id: orderId },
      include: {
        users: true,
        order_details: {
          include: {
            products: true,
            products_pricing: true,
          },
        },
        invoices: true,
      },
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    return formatJSONResponse({ order });
  } catch (error) {
    return handleError(error);
  }
};

// Yeni sipariş oluştur
export const createOrder = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    let data;
    try {
      data = JSON.parse(event.body);
      console.log("Parsed request data:", data); // Gelen veriyi logla
    } catch (e) {
      throw new AppError(400, "Invalid JSON in request body");
    }

    // Zorunlu alanları kontrol et
    if (
      !data.user_id ||
      !data.order_details ||
      !Array.isArray(data.order_details)
    ) {
      throw new AppError(400, "user_id and order_details array are required");
    }

    // Kullanıcının varlığını kontrol et
    const userExists = await prisma.users.findUnique({
      where: { user_id: Number(data.user_id) },
    });

    if (!userExists) {
      throw new AppError(404, "User not found");
    }

    // Ürünlerin varlığını kontrol et
    for (const detail of data.order_details) {
      const productExists = await prisma.products.findUnique({
        where: { product_id: Number(detail.product_id) },
      });

      if (!productExists) {
        throw new AppError(
          404,
          `Product with ID ${detail.product_id} not found`
        );
      }

      console.log("Checking price existence for ID:", detail.price_id);
      const priceExists = await prisma.products_pricing.findFirst({
        where: {
          AND: [
            { price_id: Number(detail.price_id) },
            { product_id: Number(detail.product_id) },
          ],
        },
      });

      if (!priceExists) {
        throw new AppError(
          404,
          `Price not found for product_id: ${detail.product_id} and price_id: ${detail.price_id}`
        );
      }
    }

    try {
      // Prisma transaction ile sipariş ve detaylarını oluştur
      const order = await prisma.$transaction(async (prisma) => {
        // Ana siparişi oluştur
        const newOrder = await prisma.orders.create({
          data: {
            order_no: data.order_no,
            user_id: Number(data.user_id),
            order_status: data.order_status || "order_start",
            promotion_code: data.promotion_code,
            order_date: new Date(),
            notification_sent: false,
          },
        });

        // Sipariş detaylarını oluştur
        for (const detail of data.order_details) {
          await prisma.order_details.create({
            data: {
              order_id: newOrder.order_id,
              product_id: Number(detail.product_id),
              price_id: Number(detail.price_id),
              quantity: Number(detail.quantity) || 1,
              total_price: Number(detail.total_price),
            },
          });
        }

        // Oluşturulan siparişi tüm ilişkili verilerle birlikte getir
        return prisma.orders.findUnique({
          where: { order_id: newOrder.order_id },
          include: {
            order_details: {
              include: {
                products: true,
                products_pricing: true,
              },
            },
            invoices: true,
          },
        });
      });

      return formatJSONResponse({ order }, 201);
    } catch (error) {
      return handleError(error);
    }
  } catch (error) {
    return handleError(error);
  }
};

// Sipariş güncelle
export const updateOrder = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const orderId = Number(event.pathParameters?.orderId);

    if (isNaN(orderId)) {
      throw new AppError(400, "Invalid order ID");
    }

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);

    // Siparişin var olduğunu kontrol et
    const existingOrder = await prisma.orders.findUnique({
      where: { order_id: orderId },
    });

    if (!existingOrder) {
      throw new AppError(404, "Order not found");
    }

    const order = await prisma.orders.update({
      where: { order_id: orderId },
      data: {
        order_status: data.order_status,
        promotion_code: data.promotion_code,
        notification_sent: data.notification_sent,
      },
      include: {
        order_details: {
          include: {
            products: true,
            products_pricing: true,
          },
        },
        invoices: true,
      },
    });

    return formatJSONResponse({ order });
  } catch (error) {
    return handleError(error);
  }
};

// Sipariş sil
export const deleteOrder = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const orderId = Number(event.pathParameters?.orderId);

    if (isNaN(orderId)) {
      throw new AppError(400, "Invalid order ID");
    }

    // Önce ilişkili kayıtları sil
    await prisma.$transaction(async (prisma) => {
      // Sipariş detaylarını sil
      await prisma.order_details.deleteMany({
        where: { order_id: orderId },
      });

      // Faturaları sil
      await prisma.invoices.deleteMany({
        where: { order_id: orderId },
      });

      // Siparişi sil
      await prisma.orders.delete({
        where: { order_id: orderId },
      });
    });

    return formatJSONResponse({
      message: "Order and related records deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
};
