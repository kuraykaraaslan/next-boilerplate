import Logger from '@/libs/logger';
import { NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import TOTPService from "@/modules/auth/auth.totp.service";
import AuthMessages from "@/modules/auth/auth.messages";
import { TOTPSetupDTO } from "@/modules/auth/auth.dto";
import UserSecurityService from "@/modules/user_security/user_security.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parsedData = TOTPSetupDTO.safeParse(body);
    
    if (!parsedData.success) {
      return NextResponse.json(
        { message: parsedData.error.issues.map((err: any) => err.message).join(", ") },
        { status: 400 }
      );
    }

    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER" });

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    if (userSecurity.otpMethods.includes("TOTP_APP" as any)) {
      return NextResponse.json({ message: "TOTP already enabled" }, { status: 400 });
    }

    const { secret, otpauthUrl } = await TOTPService.requestSetup({ user, userSession });

    return NextResponse.json({  message: AuthMessages.TOTP_SETUP_INITIATED, secret, otpauthUrl });
  } catch (err: any) {
    Logger.error("TOTP Setup Error:", err);
    return NextResponse.json({ message: err.message || AuthMessages.INVALID_OTP }, { status: 400 });
  }
}
