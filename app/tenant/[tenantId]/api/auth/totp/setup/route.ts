// path: app/tenant/[tenantId]/api/auth/totp/setup/route.ts
import Limiter from '@nb/limiter/server/limiter.service.next';
import Logger from '@nb/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@nb/user_session/server/user_session.service.next";
import TOTPService from "@nb/auth/server/auth.totp.service";
import TenantMemberService from "@nb/tenant_member/server/tenant_member.service";
import TenantService from "@nb/tenant/server/tenant.service";
import AuthMessages from "@nb/auth/server/auth.messages";
import { TOTPSetupDTO } from "@nb/auth/server/auth.dto";
import UserSecurityService from "@nb/user_security/server/user_security.service";

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

    const body = await request.json();

    const parsedData = TOTPSetupDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: parsedData.error.issues.map((err: any) => err.message).join(", ") },
        { status: 400 }
      );
    }

    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request });

    const tenantMember = await TenantMemberService.getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId });
    if (!tenantMember || tenantMember.memberStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 });
    }

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    if (userSecurity.otpMethods.includes("TOTP_APP" as any)) {
      return NextResponse.json({ message: "TOTP already enabled" }, { status: 400 });
    }

    const { secret, otpauthUrl } = await TOTPService.requestSetup({ user, userSession });

    return NextResponse.json({ message: AuthMessages.TOTP_SETUP_INITIATED, secret, otpauthUrl });
  } catch (err: any) {
    Logger.error("TOTP Setup Error:", err);
    return NextResponse.json({ message: err.message || AuthMessages.INVALID_OTP }, { status: 400 });
  }
}
