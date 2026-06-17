// path: app/tenant/[tenantId]/api/domains/[domainId]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantDomainService from "@kuraykaraaslan/tenant_domain/server/tenant_domain.service";
import TenantSessionNextService from "@kuraykaraaslan/tenant_session/server/tenant_session.service.next";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

/**
 * POST /tenant/[tenantId]/api/domains/[domainId]/verify
 * Trigger DNS verification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string, domainId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, domainId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const isVerified = await TenantDomainService.verifyDomain(domainId, tenantId);

    return NextResponse.json({
      success: true,
      isVerified,
      message: isVerified ? "Domain verified successfully" : "Verification failed. Please check your DNS settings."
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode ?? 400 }
    );
  }
}
