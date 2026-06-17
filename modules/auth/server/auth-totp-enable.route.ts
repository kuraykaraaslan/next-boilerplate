// path: app/tenant/[tenantId]/api/auth/totp/enable/route.ts
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@kuraykaraaslan/user_session/server/user_session.service.next";
import TOTPService from "@kuraykaraaslan/auth/server/auth.totp.service";
import TenantMemberService from "@kuraykaraaslan/tenant_member/server/tenant_member.service";
import TenantService from "@kuraykaraaslan/tenant/server/tenant.service";
import AuthMessages from "@kuraykaraaslan/auth/server/auth.messages";
import { TOTPEnableDTO } from "@kuraykaraaslan/auth/server/auth.dto";

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

    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request });

    const tenantMember = await TenantMemberService.getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId });
    if (!tenantMember || tenantMember.memberStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 });
    }

    const body = await request.json();

    const parsedData = TOTPEnableDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        message: parsedData.error.issues.map((err: any) => err.message).join(", ")
      }, { status: 400 });
    }

    const { otpToken } = parsedData.data;

    const result = await TOTPService.verifyAndEnable({ user, userSession, otpToken });

    return NextResponse.json({ message: AuthMessages.TOTP_ENABLED_SUCCESSFULLY, backupCodes: result.backupCodes });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || AuthMessages.TOTP_ENABLE_FAILED }, { status: 500 });
  }
}
