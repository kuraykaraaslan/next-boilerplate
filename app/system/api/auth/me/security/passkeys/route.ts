// path: app/system/api/auth/me/security/passkeys/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserSecurityPasskeyService from "@/modules/user_security/user_security.passkey.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/auth/me/security/passkeys
 * List all registered passkeys for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const passkeys = await UserSecurityPasskeyService.listPasskeys(user.userId);
    return NextResponse.json({ passkeys }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
