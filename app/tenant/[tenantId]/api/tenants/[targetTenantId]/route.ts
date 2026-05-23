import { NextRequest, NextResponse } from "next/server";
import TenantService from "@/modules/tenant/tenant.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import { authenticateAdminRequest } from "@/modules_next/auth/auth.admin-guard.next";

/**
 * GET /tenant/[tenantId]/api/tenants/[targetTenantId]
 * Root-tenant admin: get tenant details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    const tenant = await TenantService.getById(targetTenantId);

    return NextResponse.json({ tenant }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/tenants/[targetTenantId]
 * Root-tenant admin: update tenant details.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    const body = await request.json();

    const tenant = await TenantService.update(targetTenantId, {
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
 * DELETE /tenant/[tenantId]/api/tenants/[targetTenantId]
 * Root-tenant admin: delete tenant.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    await TenantService.delete(targetTenantId);

    return NextResponse.json({ message: "Tenant deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: error.message.includes('not found') ? 404 : 500 }
    );
  }
}
