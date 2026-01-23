// path: app/tenant/[tenantId]/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@/modules/tenant_auth/tenant_session.service.next";
import Limiter from "@/libs/limiter";
import AuthMessages from "@/modules/auth/auth.messages";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    const { tenantId } = await params;

    const { user, userSession, tenant, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "USER",
      tenantId
    });

    console.log("[SESSION-API] Authenticated successfully:", user.email);

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
    console.error("[SESSION-API] Auth failed:", error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 401 }
    );
  }
}
