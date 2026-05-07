// path: app/tenant/[tenantId]/api/domains/[domainId]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantDomainService from "@/modules/tenant_domain/tenant_domain.service";
import TenantSessionNextService from "@/modules/tenant_session/tenant_session.service.next";
import Limiter from "@/libs/limiter";

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

    const isVerified = await TenantDomainService.verifyDomain(domainId);

    return NextResponse.json({
      success: true,
      isVerified,
      message: isVerified ? "Domain verified successfully" : "Verification failed. Please check your DNS settings."
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
