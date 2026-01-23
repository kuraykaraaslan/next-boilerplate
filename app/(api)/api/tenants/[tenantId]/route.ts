import { NextResponse } from "next/server";
import TenantService from "@/modules/tenant/tenant.service";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * GET handler for retrieving a tenant by ID.
 * @param request - The incoming request object
 * @param params - URL parameters
 * @returns A NextResponse containing the tenant data or an error message
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);

    await UserSessionNextService.authenticateUserByRequest({ 
      request, 
      requiredUserRole: "ADMIN" 
    });

    const { tenantId } = await params;
    const tenant = await TenantService.getById(tenantId);

    return NextResponse.json({ tenant });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * PUT handler for updating a tenant.
 * @param request - The incoming request object
 * @param params - URL parameters
 * @returns A NextResponse containing the updated tenant data or an error message
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);

    await UserSessionNextService.authenticateUserByRequest({ 
      request, 
      requiredUserRole: "ADMIN" 
    });

    const { tenantId } = await params;
    const body = await request.json();

    const tenant = await TenantService.update(tenantId, {
      name: body.name || null,
      description: body.description || null,
      region: body.region || null,
      tenantStatus: body.tenantStatus || null
    });

    return NextResponse.json({ tenant });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * DELETE handler for deleting a tenant.
 * @param request - The incoming request object
 * @param params - URL parameters
 * @returns A NextResponse containing a success message or an error message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);

    await UserSessionNextService.authenticateUserByRequest({ 
      request, 
      requiredUserRole: "ADMIN" 
    });

    const { tenantId } = await params;
    await TenantService.delete(tenantId);

    return NextResponse.json({ message: "Tenant deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}
