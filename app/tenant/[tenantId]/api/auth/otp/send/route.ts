// path: app/tenant/[tenantId]/api/auth/otp/send/route.ts
import Limiter from '@/modules_next/limiter/limiter.service.next';
import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import OTPService from "@/modules/auth/auth.otp.service";
import TenantMemberService from "@/modules/tenant_member/tenant_member.service";
import TenantService from "@/modules/tenant/tenant.service";
import AuthMessages from "@/modules/auth/auth.messages";
import { RequestOTPDTO } from "@/modules/auth/auth.dto";
import UserSecurityService from "@/modules/user_security/user_security.service";
import { resolveLocale } from "@/modules/auth/auth.i18n";

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

    const parsedData = RequestOTPDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        message: parsedData.error.issues.map((err: any) => err.message).join(", ")
      }, { status: 400 });
    }

    const { method, action } = parsedData.data;

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);
    const userOTPMethods = userSecurity.otpMethods;

    if (action === "enable" && userOTPMethods.includes(method)) {
      return NextResponse.json(
        { message: AuthMessages.OTP_METHOD_ALREADY_ENABLED },
        { status: 400 }
      );
    }

    if (action === "disable" && !userOTPMethods.includes(method)) {
      return NextResponse.json(
        { message: AuthMessages.OTP_METHOD_NOT_ENABLED },
        { status: 400 }
      );
    }

    const locale = resolveLocale(request.headers.get('accept-language'));
    await OTPService.requestOTP({ user, userSession, method, action, tenantId, locale });

    return NextResponse.json({ message: AuthMessages.OTP_SENT_SUCCESSFULLY });

  } catch (err: any) {
    Logger.error("Send OTP Error:");
    return NextResponse.json(
      {
        message: err.message || AuthMessages.OTP_SEND_FAILED,
      },
      { status: 400 }
    );
  }
}
