import Logger from '@kuraykaraaslan/logger';
// path: app/tenant/[tenantId]/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@kuraykaraaslan/tenant_session/server/tenant_session.service.next";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";
import AuthMessages from "@kuraykaraaslan/auth/server/auth.messages";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user, userSession, tenant, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId
    });

    Logger.info("[SESSION-API] Authenticated successfully:", user.email);

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        userRole: user.userRole,
      },
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
        description: tenant.description,
        tenantStatus: tenant.tenantStatus,
      },
      tenantMember: {
        tenantMemberId: tenantMember.tenantMemberId,
        memberRole: tenantMember.memberRole,
        memberStatus: tenantMember.memberStatus,
      },
      message: AuthMessages.SESSION_RETRIEVED_SUCCESSFULLY
    }, { status: 200 });
  } catch (error: any) {
    Logger.error("[SESSION-API] Auth failed:", error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 401 }
    );
  }
}
