// path: app/tenant/[tenantId]/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@/modules_next/tenant_session/tenant_session.service.next";
import Limiter from "@/modules_next/limiter/limiter.service.next";

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
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user, userSession, tenant, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
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
