// path: app/tenant/[tenantId]/api/auth/otp/verify/route.ts
import Limiter from '@nb/limiter/server/limiter.service.next';
import Logger from '@nb/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@nb/user_session/server/user_session.service.next";
import OTPService from "@nb/auth/server/auth.otp.service";
import TenantMemberService from "@nb/tenant_member/server/tenant_member.service";
import TenantService from "@nb/tenant/server/tenant.service";
import { VerifyOTPDTO } from "@nb/auth/server/auth.dto";
import { OTPActionEnum } from "@nb/user_security/server/user_security.enums";
import AuthMessages from "@nb/auth/server/auth.messages";
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

    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request });

    const tenantMember = await TenantMemberService.getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId });
    if (!tenantMember || tenantMember.memberStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'You are not a member of this organization' }, { status: 403 });
    }

    const body = await request.json();

    const parsedData = VerifyOTPDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: parsedData.error.issues.map(err => err.message).join(", ") },
        { status: 400 }
      );
    }

    const { method, action, otpToken } = parsedData.data;

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    const userOTPMethods = userSecurity.otpMethods;

    await OTPService.verifyOTP({ user, userSession, method, action, otpToken, tenantId });
    // Update user security settings based on action

    if (action === OTPActionEnum.enum.enable && !userOTPMethods.includes(method)) {
      const updatedMethods = [...userOTPMethods, method];
      await UserSecurityService.updateUserSecurity(user.userId, { otpMethods: updatedMethods });
    }

    if (action === OTPActionEnum.enum.disable && userOTPMethods.includes(method)) {
      const updatedMethods = userOTPMethods.filter(m => m !== method);
      await UserSecurityService.updateUserSecurity(user.userId, { otpMethods: updatedMethods });
    }

    return NextResponse.json({ message: AuthMessages.OTP_VERIFIED_SUCCESSFULLY }, { status: 200 });

  } catch (err: any) {
    Logger.error("Verify OTP Error:", err);
    return NextResponse.json(
      {
        message: err.message || AuthMessages.OTP_VERIFICATION_FAILED,
      },
      { status: 500 }
    );
  }
}
