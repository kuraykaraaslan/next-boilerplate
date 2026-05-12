// path: app/system/api/auth/me/security/passkeys/[credentialId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import UserSecurityPasskeyService from "@/modules/user_security/user_security.passkey.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * DELETE /system/api/auth/me/security/passkeys/[credentialId]
 * Remove a registered passkey for the current user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const { credentialId } = await params;
    await UserSecurityPasskeyService.deletePasskey(user, credentialId);

    return NextResponse.json({ message: "Passkey removed" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
