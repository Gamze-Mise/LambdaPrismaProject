import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../../libs/prisma";
import { AppError, handleError } from "../../libs/errors";
import { formatJSONResponse } from "../../libs/apiGateway";

// Tüm faturaları getir
export const getInvoices = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const page = Number(event.queryStringParameters?.page || "1");
    const limit = Number(event.queryStringParameters?.limit || "10");
    const userId = event.queryStringParameters?.userId;
    const orderId = event.queryStringParameters?.orderId;
    const invoiceNo = event.queryStringParameters?.invoiceNo;

    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where = {
      ...(userId && { user_id: Number(userId) }),
      ...(orderId && { order_id: Number(orderId) }),
      ...(invoiceNo && { invoice_no: invoiceNo }),
    };

    const invoices = await prisma.invoices.findMany({
      skip,
      take: limit,
      where,
      include: {
        orders: true,
        invoice_details: true,
      },
      orderBy: {
        invoice_date: "desc",
      },
    });

    const total = await prisma.invoices.count({ where });

    return formatJSONResponse({
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getInvoices:", error);
    return handleError(error);
  }
};

// Belirli bir faturayı getir
export const getInvoice = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const invoiceId = Number(event.pathParameters?.invoiceId);

    if (isNaN(invoiceId)) {
      throw new AppError(400, "Invalid invoice ID");
    }

    const invoice = await prisma.invoices.findUnique({
      where: { invoice_id: invoiceId },
      include: {
        orders: true,
        invoice_details: true,
      },
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found");
    }

    return formatJSONResponse({ invoice });
  } catch (error) {
    return handleError(error);
  }
};

// Yeni fatura oluştur
export const createInvoice = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);

    // Zorunlu alanları kontrol et
    if (!data.user_id || !data.order_id || !data.invoice_details) {
      throw new AppError(
        400,
        "user_id, order_id and invoice_details are required"
      );
    }

    // invoice_type kontrolü
    const validInvoiceTypes = ["individual", "corporate"];
    const invoice_type = data.invoice_type?.toLowerCase() || "individual";

    if (!validInvoiceTypes.includes(invoice_type)) {
      throw new AppError(
        400,
        `Invalid invoice_type. Must be one of: ${validInvoiceTypes.join(", ")}`
      );
    }

    // Sipariş kontrolü
    const orderExists = await prisma.orders.findUnique({
      where: { order_id: Number(data.order_id) },
    });

    if (!orderExists) {
      throw new AppError(404, "Order not found");
    }

    const invoice = await prisma.$transaction(async (tx) => {
      // Ana faturayı oluştur
      const newInvoice = await tx.invoices.create({
        data: {
          order_id: Number(data.order_id),
          user_id: Number(data.user_id),
          invoice_type: invoice_type as "individual" | "corporate",
          invoice_date: new Date(),
        },
      });

      // Fatura detaylarını oluştur
      await tx.invoice_details.create({
        data: {
          invoice_id: newInvoice.invoice_id,
          name_or_firm: data.invoice_details.name_or_firm,
          surname_or_tax_office: data.invoice_details.surname_or_tax_office,
          identify_or_tax_number: data.invoice_details.identify_or_tax_number,
          address: data.invoice_details.address,
          district: data.invoice_details.district,
          city: data.invoice_details.city,
          country: data.invoice_details.country,
          country_code: data.invoice_details.country_code || null,
          phone: data.invoice_details.phone,
        },
      });

      return tx.invoices.findUnique({
        where: { invoice_id: newInvoice.invoice_id },
        include: {
          orders: true,
          invoice_details: true,
        },
      });
    });

    return formatJSONResponse({ invoice }, 201);
  } catch (error) {
    console.error("Error in createInvoice:", error);
    return handleError(error);
  }
};

// Fatura güncelle
export const updateInvoice = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const invoiceId = Number(event.pathParameters?.invoiceId);

    if (isNaN(invoiceId)) {
      throw new AppError(400, "Invalid invoice ID");
    }

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);

    // invoice_type kontrolü
    if (data.invoice_type) {
      const validInvoiceTypes = ["individual", "corporate"];
      const invoice_type = data.invoice_type.toLowerCase();

      if (!validInvoiceTypes.includes(invoice_type)) {
        throw new AppError(
          400,
          `Invalid invoice_type. Must be one of: ${validInvoiceTypes.join(
            ", "
          )}`
        );
      }
      data.invoice_type = invoice_type;
    }

    // Faturanın var olduğunu kontrol et
    const existingInvoice = await prisma.invoices.findUnique({
      where: { invoice_id: invoiceId },
      include: {
        invoice_details: true,
      },
    });

    if (!existingInvoice) {
      throw new AppError(404, "Invoice not found");
    }

    // Fatura detayının detail_id'sini al
    const detailId = existingInvoice.invoice_details[0]?.detail_id;
    if (!detailId) {
      throw new AppError(404, "Invoice details not found");
    }

    const invoice = await prisma.$transaction(async (tx) => {
      // Ana faturayı güncelle
      const updatedInvoice = await tx.invoices.update({
        where: { invoice_id: invoiceId },
        data: {
          invoice_type: data.invoice_type as "individual" | "corporate",
        },
      });

      // Fatura detaylarını güncelle
      if (data.invoice_details) {
        await tx.invoice_details.update({
          where: {
            detail_id: detailId, // invoice_id yerine detail_id kullanıyoruz
          },
          data: {
            name_or_firm: data.invoice_details.name_or_firm,
            surname_or_tax_office: data.invoice_details.surname_or_tax_office,
            identify_or_tax_number: data.invoice_details.identify_or_tax_number,
            address: data.invoice_details.address,
            district: data.invoice_details.district,
            city: data.invoice_details.city,
            country: data.invoice_details.country,
            country_code: data.invoice_details.country_code,
            phone: data.invoice_details.phone,
          },
        });
      }

      // Güncellenmiş faturayı getir
      return tx.invoices.findUnique({
        where: { invoice_id: invoiceId },
        include: {
          orders: true,
          invoice_details: true,
        },
      });
    });

    return formatJSONResponse({ invoice });
  } catch (error) {
    console.error("Error in updateInvoice:", error);
    return handleError(error);
  }
};

// Fatura sil
export const deleteInvoice = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const invoiceId = Number(event.pathParameters?.invoiceId);

    if (isNaN(invoiceId)) {
      throw new AppError(400, "Invalid invoice ID");
    }

    // Önce ilişkili detayları sil
    await prisma.$transaction(async (tx) => {
      await tx.invoice_details.deleteMany({
        where: { invoice_id: invoiceId },
      });

      await tx.invoices.delete({
        where: { invoice_id: invoiceId },
      });
    });

    return formatJSONResponse({
      message: "Invoice and related details deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
};
