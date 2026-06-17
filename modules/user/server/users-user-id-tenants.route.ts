import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from "next/server";
import TenantMemberService from "@kuraykaraaslan/tenant_member/server/tenant_member.service";
import { authenticateAdminRequest } from "@kuraykaraaslan/auth/server/auth.admin-guard.next";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { userId } = await params;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const memberships = await TenantMemberService.getUserTenants(userId);

    return NextResponse.json({ memberships }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
