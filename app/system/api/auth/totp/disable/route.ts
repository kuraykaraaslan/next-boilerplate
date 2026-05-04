import Logger from '@/libs/logger';
import { NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import TOTPService from "@/modules/auth/auth.totp.service";
import UserSessionMessages from "@/modules/user_session/user_session.messages";
import AuthMessages from "@/modules/auth/auth.messages";
import { TOTPDisableDTO } from "@/modules/auth/auth.dto";

export async function POST(request: NextRequest) {
  try {
    const { user } = await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "USER" });

    const body = await request.json();

    const parsedData = TOTPDisableDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({
        message: parsedData.error.issues.map((err: any) => err.message).join(", ")
      }, { status: 400 });
    }

    const { otpToken } = parsedData.data;

    await TOTPService.disable({ user, otpToken });

    return NextResponse.json({ message: AuthMessages.TOTP_DISABLED_SUCCESSFULLY });
  } catch (err: any) {
    Logger.error("TOTP Disable Error:", err);
    return NextResponse.json({ message: err.message || AuthMessages.TOTP_DISABLE_FAILED }, { status: 500 });
  }
}
