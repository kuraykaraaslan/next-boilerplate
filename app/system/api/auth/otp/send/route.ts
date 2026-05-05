import Limiter from '@/libs/limiter';
import Logger from '@/libs/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import OTPService from "@/modules/auth/auth.otp.service";
import AuthService from "@/modules/auth/auth.service";
import AuthMessages from "@/modules/auth/auth.messages";
import { RequestOTPDTO } from "@/modules/auth/auth.dto";
import UserSecurityService from "@/modules/user_security/user_security.service";

export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

        // Authenticate the user
    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:read"] });

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

    await OTPService.requestOTP({ user, userSession, method, action });

    return NextResponse.json({  message: AuthMessages.OTP_SENT_SUCCESSFULLY });


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

