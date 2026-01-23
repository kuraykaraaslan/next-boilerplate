// path: app/tenant/[tenantId]/api/domains/[domainId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantDomainService from "@/modules/tenant_domain/tenant_domain.service";
import TenantSessionNextService from "@/modules/tenant_auth/tenant_session.service.next";
import Limiter from "@/libs/limiter";

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

    const verificationInfo = await TenantDomainService.getVerificationInfo(domainId);

    return NextResponse.json({
      success: true,
      ...verificationInfo
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
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
    await Limiter.checkRateLimit(request);
    const { tenantId, domainId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "OWNER",
      tenantId
    });

    await TenantDomainService.delete(domainId);

    return NextResponse.json({
      success: true,
      message: "Domain deleted successfully"
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
