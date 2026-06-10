// path: app/tenant/[tenantId]/api/domains/[domainId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantDomainService from "@/modules/tenant_domain/tenant_domain.service";
import TenantSessionNextService from "@/modules_next/tenant_session/tenant_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/domains/[domainId]
 * Get domain details including verification info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string, domainId: string }> }
) {
  try {
    const { tenantId, domainId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const verificationInfo = await TenantDomainService.getVerificationInfo(domainId, tenantId);

    return NextResponse.json({
      success: true,
      ...verificationInfo
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode ?? 400 }
    );
  }
}

/**
 * DELETE /tenant/[tenantId]/api/domains/[domainId]
 * Remove a domain
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string, domainId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, domainId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "OWNER",
      tenantId
    });

    await TenantDomainService.delete(domainId, tenantId);

    return NextResponse.json({
      success: true,
      message: "Domain deleted successfully"
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode ?? 400 }
    );
  }
}
