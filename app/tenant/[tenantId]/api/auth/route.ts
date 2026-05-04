// path: app/tenant/[tenantId]/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@/modules/tenant_session/tenant_session.service.next";
import Limiter from "@/libs/limiter";

/**
 * GET /tenant/[tenantId]/api/auth
 * Check if user is authenticated and member of tenant
 * Returns tenant and member info if authenticated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    const { tenantId } = await params;

    const { user, userSession, tenant, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredScopes: ["tenant:read"],
      tenantId
    });

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        userRole: user.userRole
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
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 401 }
    );
  }
}
