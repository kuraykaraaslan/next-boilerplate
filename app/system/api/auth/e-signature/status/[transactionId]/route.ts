import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import ESignatureService from '@/modules/e_signature/e_signature.service';
import UserService from '@/modules/user/user.service';
import UserSecurityService from '@/modules/user_security/user_security.service';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import { SafeUserSecuritySchema } from '@/modules/user_security/user_security.types';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { E_SIGNATURE_MESSAGES } from '@/modules/e_signature/e_signature.messages';

interface RouteContext {
  params: Promise<{ transactionId: string }>;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'auth');
    if (rl) return rl;

    const { transactionId } = await ctx.params;
    const ip = Limiter.getIpFromRequest(request);
    const ua = request.headers.get('user-agent') || null;

    const result = await ESignatureService.pollStatus({ transactionId, ip, ua });

    if (result.status !== 'signed') {
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    // Signed but no user — caller must run the bind flow first.
    if (!result.matchedUserId) {
      await AuditLogService.log({
        action: 'auth.e_signature.signed_needs_binding',
        actorType: 'SYSTEM',
        resourceType: 'e_signature_transaction',
        resourceId: transactionId,
        ipAddress: ip ?? undefined,
        userAgent: ua ?? undefined,
        metadata: {
          provider: result.transactionRecord.providerName,
          country: result.transactionRecord.country,
          cert_fingerprint: result.identity.evidence.fingerprint_sha256,
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NEEDS_BINDING', message: E_SIGNATURE_MESSAGES.NEEDS_BINDING },
          data: {
            status: 'signed_needs_binding',
            identity: result.identity,
          },
        },
        { status: 403 },
      );
    }

    // Bind purpose: do NOT mint a new session — caller already has one.
    if (result.transactionRecord.purpose === 'bind') {
      await AuditLogService.log({
        action: 'auth.e_signature.bound',
        actorType: 'USER',
        actorId: result.matchedUserId,
        resourceType: 'signing_certificate',
        resourceId: result.boundSigningCertificateId ?? undefined,
        ipAddress: ip ?? undefined,
        userAgent: ua ?? undefined,
        metadata: {
          provider: result.transactionRecord.providerName,
          country: result.transactionRecord.country,
        },
      });
      return NextResponse.json(
        { success: true, data: { status: 'bound', identity: result.identity } },
        { status: 200 },
      );
    }

    // Login purpose: mint session + cookies (mirrors app/system/api/auth/login/route.ts)
    const user = await UserService.getById(result.matchedUserId);
    const userSecurity = await UserSecurityService.getSafeByUserId(result.matchedUserId);

    const { rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
      user,
      request,
      userSecurity,
      otpIgnore: true, // QES login is itself a strong-authentication factor
    });

    const origin = request.headers.get('origin') || '';
    const protocol =
      request.headers.get('x-forwarded-proto') ||
      request.headers.get('x-scheme') ||
      'http';
    const isSecure = origin.startsWith('https://') || protocol === 'https';
    const cookieOptions = isSecure
      ? {
          httpOnly: true,
          secure: true,
          sameSite: 'none' as const,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        }
      : {
          httpOnly: true,
          sameSite: 'lax' as const,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        };

    const response = NextResponse.json(
      {
        success: true,
        data: {
          status: 'signed',
          identity: result.identity,
          user,
          userSecurity: SafeUserSecuritySchema.parse(userSecurity),
        },
      },
      { status: 200 },
    );
    response.cookies.set('accessToken', rawAccessToken, cookieOptions);
    response.cookies.set('refreshToken', rawRefreshToken, cookieOptions);

    await AuditLogService.log({
      action: 'auth.login.e_signature',
      actorType: 'USER',
      actorId: result.matchedUserId,
      resourceType: 'user_session',
      ipAddress: ip ?? undefined,
      userAgent: ua ?? undefined,
      metadata: {
        provider: result.transactionRecord.providerName,
        country: result.transactionRecord.country,
        loa: result.identity.loa,
        cert_serial: result.identity.evidence.serial,
        cert_issuer: result.identity.evidence.issuer_dn,
      },
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'e_signature.status failed';
    Logger.warn(`e_signature status failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 400 });
  }
}
