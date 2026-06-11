// path: app/tenant/[tenantId]/api/auth/otp/verify/route.ts
import Limiter from '@/modules_next/limiter/limiter.service.next';
import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import OTPService from "@/modules/auth/auth.otp.service";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import TenantService from "@/modules/tenant/tenant.service";
import { VerifyOTPDTO } from "@/modules/auth/auth.dto";
import { OTPActionEnum } from "@/modules/user_security/user_security.enums";
import AuthMessages from "@/modules/auth/auth.messages";
import UserSecurityService from "@/modules/user_security/user_security.service";

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
