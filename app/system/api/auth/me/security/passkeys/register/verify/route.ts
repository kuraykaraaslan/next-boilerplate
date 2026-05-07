// path: app/system/api/auth/me/security/passkeys/register/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserSecurityPasskeyService from "@/modules/user_security/user_security.passkey.service";
import Limiter from "@/libs/limiter";
import { z } from "zod";

const VerifyRegistrationDTO = z.object({
  response: z.record(z.string(), z.any()),
  label: z.string().optional(),
});

/**
 * POST /system/api/auth/me/security/passkeys/register/verify
 * Verify and store WebAuthn registration response
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const body = await request.json();
    const parsed = VerifyRegistrationDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const { credentialId } = await UserSecurityPasskeyService.verifyRegistration({
      user,
      response: parsed.data.response as any,
      label: parsed.data.label,
    });

    return NextResponse.json({ message: "Passkey registered", credentialId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
