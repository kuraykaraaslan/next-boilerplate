import { NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import OTPService from "@/modules/auth/auth.otp.service";
import TOTPService from "@/modules/auth/auth.totp.service";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";
import { VerifyOTPDTO } from "@/modules/auth/auth.dto";
import UserSessionService from "@/modules/user_session/user_session.service";

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER", otpVerifyBypass: true });

    const body = await request.json();
    
    const parsedData = VerifyOTPDTO.safeParse(body);
    
    if (!parsedData.success) {
      return NextResponse.json({
        message: parsedData.error.issues.map((err: any) => err.message).join(", ")
      }, { status: 400 });
    }

    const { method, otpToken, action } = parsedData.data;

    if (action !== "authenticate") {
      return NextResponse.json(
        { message: AuthMessages.INVALID_OTP_ACTION },
        { status: 400 }
      );
    }

    if (method === "TOTP_APP") {
      const isTOTPValid = await TOTPService.verifyAuthenticate({ user: user, otpToken });

      if (!isTOTPValid) {
        return NextResponse.json(
          { message: AuthMessages.INVALID_TOKEN },
          { status: 400 }
        );
      }
    }
    else { await OTPService.verifyOTP({ user, userSession, method, otpToken, action });
    }

    await UserSessionService.updateSession(userSession.userSessionId, { otpVerifyNeeded: false });

    return NextResponse.json({  message: AuthMessages.OTP_VERIFIED_SUCCESSFULLY });

  } catch (err: any) {
    console.error("Send OTP Error:", err);
    return NextResponse.json(
      {
        message: err.message || "OTP could not be sent",
      },
      { status: 400 }
    );
  }
}

