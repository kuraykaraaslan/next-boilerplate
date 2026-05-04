import Logger from '@/libs/logger';
import { NextRequest, NextResponse } from "next/server";
import TenantService from "@/modules/tenant/tenant.service";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * GET handler for retrieving all tenants.
 * @param request - The incoming request object
 * @returns A NextResponse containing the tenant data or an error message
 */
export async function GET(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);

    // Only admins can view all tenants
    await UserSessionNextService.authenticateUserByRequest({ 
      request, 
      requiredScopes: ["system:admin"] 
    });

    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') || '1', 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize') || '10', 10) : 10;
    const search = searchParams.get('search') || null;

    Logger.info('Fetching tenants with', { page, pageSize, search });

    const { tenants, total } = await TenantService.getAll({
      page,
      pageSize,
      search,
      tenantId: null
    });

    Logger.info(`Fetched ${tenants.length} tenants (total: ${total})`);

    return NextResponse.json({ tenants, total, page, pageSize });
  } catch (error: any) {
    Logger.error('Error fetching tenants:', error);
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new tenant.
 * @param request - The incoming request object
 * @returns A NextResponse containing the new tenant data or an error message
 */
export async function POST(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);

    // Only admins can create tenants
    await UserSessionNextService.authenticateUserByRequest({ 
      request, 
      requiredScopes: ["system:admin"] 
    });

    const body = await request.json();

    const tenant = await TenantService.create({
      name: body.name,
      description: body.description || null,
      region: body.region || 'TR'
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
