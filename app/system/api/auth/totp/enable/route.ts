import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import TOTPService from "@/modules/auth/auth.totp.service";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";
import { TOTPEnableDTO } from "@/modules/auth/auth.dto";

export async function POST(request: NextRequest) {
  try {
    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:read"] });

    const body = await request.json();

    const parsedData = TOTPEnableDTO.safeParse(body);
    
    if (!parsedData.success) {
      return NextResponse.json({
        
        message: parsedData.error.issues.map((err: any) => err.message).join(", ")
      }, { status: 400 });
    }

    const { otpToken } = parsedData.data;

    const result = await TOTPService.verifyAndEnable({ user, userSession, otpToken });

    return NextResponse.json({  message: AuthMessages.TOTP_ENABLED_SUCCESSFULLY, backupCodes: result.backupCodes });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || AuthMessages.TOTP_ENABLE_FAILED }, { status: 500 });
  }
}
