// path: app/system/api/tenants/[tenantId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantService from "@/modules/tenant/tenant.service";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/tenants/[tenantId]
 * Get tenant details (requires global ADMIN role)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const tenant = await TenantService.getById(tenantId);

    return NextResponse.json({ tenant }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * PUT /system/api/tenants/[tenantId]
 * Update tenant details (requires global ADMIN role)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const body = await request.json();

    const tenant = await TenantService.update(tenantId, {
      name: body.name,
      description: body.description,
      tenantStatus: body.tenantStatus,
      region: body.region,
    });

    return NextResponse.json({ tenant, message: "Tenant updated successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * DELETE /system/api/tenants/[tenantId]
 * Delete tenant (requires global ADMIN role)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    await TenantService.delete(tenantId);

    return NextResponse.json({ message: "Tenant deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}
