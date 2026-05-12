import Limiter from '@/modules_next/limiter/limiter.service.next';
import Logger from '@/modules/logger';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import OTPService from "@/modules/auth/auth.otp.service";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthService from "@/modules/auth/auth.service";
import MailService from "@/modules/notification_mail/notification_mail.service";
import SMSService from "@/modules/notification_sms/notification_sms.service";
import AuthMessages from "@/modules/auth/auth.messages";
import { RequestOTPDTO } from "@/modules/auth/auth.dto";
import UserSecurityService from "@/modules/user_security/user_security.service";

export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

        // Authenticate the user
    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request, otpVerifyBypass: true });

    const body = await request.json();

    // Validate request with schema
    const parsedData = RequestOTPDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { message: parsedData.error.issues.map((err: any) => err.message).join(", ") },
        { status: 400 }
      );
    }

    const { method, action } = parsedData.data;

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    // check if method is enabled
    if (!userSecurity.otpMethods.includes(method)) {
      return NextResponse.json(
        { message: AuthMessages.OTP_METHOD_NOT_ENABLED },
        { status: 400 }
      );
    }

    if (method === 'TOTP_APP') {
      return NextResponse.json({ 
        message: AuthMessages.USE_AUTHENTICATOR_APP 
      });
    }

    else if (method === 'EMAIL') {
      await OTPService.requestOTP({ user, userSession, method, action });
    } 
   
    else if (method === 'SMS') {
      await OTPService.requestOTP({ user, userSession, method, action });
    }
    
    else {
      return NextResponse.json(
        { message: AuthMessages.INVALID_OTP_METHOD },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
       
      message: AuthMessages.OTP_SENT_SUCCESSFULLY 
    });


  } catch (err: any) {
    Logger.error("Send OTP Error:");
    return NextResponse.json(
      {
        message: err.message || AuthMessages.OTP_SEND_FAILED,
      },
      { status: 500 }
    );
  }
}

