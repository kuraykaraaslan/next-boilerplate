// path: app/system/api/auth/me/security/passkeys/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserSecurityPasskeyService from "@/modules/user_security/user_security.passkey.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/auth/me/security/passkeys/register
 * Generate WebAuthn registration options for the current user
 */
export async function GET(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);

    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const options = await UserSecurityPasskeyService.generateRegistrationOptions(user);
    return NextResponse.json(options, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
