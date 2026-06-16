// path: app/tenant/[tenantId]/api/settings/branding/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@nb/tenant_session/server/tenant_session.service.next";
import TenantBrandingService from "@nb/tenant_branding/server/tenant_branding.service";
import { TenantBrandingSchema } from "@nb/tenant_branding/server/tenant_branding.types";
import Limiter from "@nb/limiter/server/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/settings/branding
 * Get branding settings for the tenant (tenant:admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const branding = await TenantBrandingService.get(tenantId);

    return NextResponse.json({ branding }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /tenant/[tenantId]/api/settings/branding
 * Update branding settings for the tenant (tenant:admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const body = await request.json();
    const parsed = TenantBrandingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const branding = await TenantBrandingService.update(tenantId, parsed.data);

    return NextResponse.json({ message: "Branding updated", branding }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /tenant/[tenantId]/api/settings/branding
 * Reset all branding settings to defaults (tenant:owner)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "OWNER",
      tenantId,
    });

    await TenantBrandingService.reset(tenantId);

    return NextResponse.json({ message: "Branding reset to defaults" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
