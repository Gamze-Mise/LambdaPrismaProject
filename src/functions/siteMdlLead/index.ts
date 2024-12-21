import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import prisma from "../../libs/prisma";
import { AppError, handleError } from "../../libs/errors";
import { formatJSONResponse } from "../../libs/apiGateway";

// Tüm lead'leri getir
export const getSiteMdlLeads = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const page = Number(event.queryStringParameters?.page || "1");
    const limit = Number(event.queryStringParameters?.limit || "10");
    const siteId = event.queryStringParameters?.siteId;
    const status = event.queryStringParameters?.status;

    const skip = (page - 1) * limit;

    const where = {
      ...(siteId && { site_id: Number(siteId) }),
      ...(status && { status: status }),
    };

    const leads = await prisma.site_mdl_leads.findMany({
      skip,
      take: limit,
      where,
      orderBy: {
        created_at: "desc",
      },
      include: {
        user_sites: true,
      },
    });

    const total = await prisma.site_mdl_leads.count({ where });

    return formatJSONResponse({
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Yeni lead oluştur
export const createSiteMdlLead = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);

    // Zorunlu alanları kontrol et
    if (!data.site_id || !data.name || !data.email) {
      throw new AppError(400, "site_id, name and email are required");
    }

    // Site'ın varlığını kontrol et
    const siteExists = await prisma.user_sites.findUnique({
      where: { site_id: Number(data.site_id) },
    });

    if (!siteExists) {
      throw new AppError(404, "Site not found");
    }

    const lead = await prisma.site_mdl_leads.create({
      data: {
        site_id: Number(data.site_id),
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        status: data.status || "new",
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        user_sites: true,
      },
    });

    return formatJSONResponse({ lead }, 201);
  } catch (error) {
    return handleError(error);
  }
};

// Lead güncelle
export const updateSiteMdlLead = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const leadId = Number(event.pathParameters?.leadId);

    if (isNaN(leadId)) {
      throw new AppError(400, "Invalid lead ID");
    }

    if (!event.body) {
      throw new AppError(400, "Request body is required");
    }

    const data = JSON.parse(event.body);

    // Lead'in varlığını kontrol et
    const existingLead = await prisma.site_mdl_leads.findUnique({
      where: { lead_id: leadId },
    });

    if (!existingLead) {
      throw new AppError(404, "Lead not found");
    }

    const lead = await prisma.site_mdl_leads.update({
      where: { lead_id: leadId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        status: data.status,
        updated_at: new Date(),
      },
      include: {
        user_sites: true,
      },
    });

    return formatJSONResponse({ lead });
  } catch (error) {
    return handleError(error);
  }
};

// Lead sil
export const deleteSiteMdlLead = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const leadId = Number(event.pathParameters?.leadId);

    if (isNaN(leadId)) {
      throw new AppError(400, "Invalid lead ID");
    }

    await prisma.site_mdl_leads.delete({
      where: { lead_id: leadId },
    });

    return formatJSONResponse({
      message: "Lead deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
};
