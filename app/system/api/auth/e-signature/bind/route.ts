import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import OTPService from '@/modules/auth/auth.otp.service';
import ESignatureService from '@/modules/e_signature/e_signature.service';
import { InitiateBindDTO } from '@/modules/e_signature/e_signature.dto';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { E_SIGNATURE_MESSAGES } from '@/modules/e_signature/e_signature.messages';

export async function POST(request: NextRequest) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'auth');
    if (rl) return rl;

    const auth = await UserSessionNextService.authenticateUserByRequest({ request });
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = InitiateBindDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // 2FA gate — caller must present a fresh OTP bound to the current
    // session. We reuse the existing `authenticate` action because binding a
    // new signing identity is a re-authentication event; this avoids adding
    // a new OTPAction enum value across the codebase.
    try {
      await OTPService.verifyOTP({
        user: auth.user,
        userSession: auth.userSession,
        method: 'EMAIL',
        action: 'authenticate',
        otpToken: parsed.data.otpToken,
      });
    } catch (err) {
      Logger.warn(`bind otp verify failed: ${err instanceof Error ? err.message : err}`);
      return NextResponse.json(
        { success: false, error: { code: 'BIND_2FA_REQUIRED', message: E_SIGNATURE_MESSAGES.BIND_2FA_REQUIRED } },
        { status: 401 },
      );
    }

    const ip = Limiter.getIpFromRequest(request);
    const ua = request.headers.get('user-agent') || null;

    const result = await ESignatureService.initiateLogin({
      country: parsed.data.country,
      identifier: parsed.data.identifier,
      providerOverride: parsed.data.providerOverride,
      ip,
      ua,
      purpose: 'bind',
      initiatingUserId: auth.user.userId,
    });

    await AuditLogService.log({
      action: 'auth.e_signature.bind_initiate',
      actorType: 'USER',
      actorId: auth.user.userId,
      resourceType: 'e_signature_transaction',
      resourceId: result.transactionId,
      ipAddress: ip ?? undefined,
      userAgent: ua ?? undefined,
      metadata: {
        provider: result.providerName,
        country: parsed.data.country,
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'e_signature.bind failed';
    Logger.warn(`e_signature bind failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
