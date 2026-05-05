import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { userId } = await params;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

    const memberships = await TenantMemberService.getUserTenants(userId);

    return NextResponse.json({ memberships }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
