// path: app/tenant/[tenantId]/api/auth/totp/disable/route.ts
import Limiter from '@nb/limiter/server/limiter.service.next';
import Logger from '@nb/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@nb/user_session/server/user_session.service.next";
import TOTPService from "@nb/auth/server/auth.totp.service";
import TenantMemberService from "@nb/tenant_member/server/tenant_member.service";
import TenantService from "@nb/tenant/server/tenant.service";
import AuthMessages from "@nb/auth/server/auth.messages";
import { TOTPDisableDTO } from "@nb/auth/server/auth.dto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    const tenantMember = await TenantMemberService.getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId });
    if (!tenantMember || tenantMember.memberStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 });
    }

    const body = await request.json();

    const parsedData = TOTPDisableDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        message: parsedData.error.issues.map((err: any) => err.message).join(", ")
      }, { status: 400 });
    }

    const { otpToken } = parsedData.data;

    await TOTPService.disable({ user, otpToken });

    return NextResponse.json({ message: AuthMessages.TOTP_DISABLED_SUCCESSFULLY });
  } catch (err: any) {
    Logger.error("TOTP Disable Error:", err);
    return NextResponse.json({ message: err.message || AuthMessages.TOTP_DISABLE_FAILED }, { status: 500 });
  }
}
