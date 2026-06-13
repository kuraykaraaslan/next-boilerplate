// path: app/tenant/[tenantId]/api/auth/me/merge-identity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import AuthCredentialService from '@/modules/auth/auth.credential.service';
import SocialIdentityMergeService from '@/modules/user_social_account/social_identity_merge.service';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import UserSecurityService from '@/modules/user_security/user_security.service';
import UserService from '@/modules/user/user.service';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import { AppError, ErrorCode } from '@/modules/common/app-error';

/**
 * POST /tenant/[tenantId]/api/auth/me/merge-identity
 *
 * "I already have an account" — merges the current synthetic (no-email) session
 * INTO an existing account whose credentials the caller proves here. Ownership is
 * verified via AuthCredentialService.login (password + lockout/captcha), then the
 * federated identity is moved and a fresh session is minted for the real account.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  const { tenantId } = await params;
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;

  try {
    const { user: placeholder } = await UserSessionNextService.authenticateUserByRequest({ request: req });
    if (!SSOService.isPlaceholderEmail(placeholder.email)) {
      throw new AppError('This account already has an email; nothing to merge.', 400, ErrorCode.VALIDATION_ERROR);
    }

    const { email, password, captchaToken } = await req.json();
    if (!email || !password) throw new AppError('Email and password are required.', 400, ErrorCode.VALIDATION_ERROR);

    // Ownership proof for the target account (throws on bad creds / lockout).
    const { user: target } = await AuthCredentialService.login({
      email, password, captchaToken, tenantId, ipAddress: ipAddress ?? undefined, userAgent: userAgent ?? undefined,
    });

    await SocialIdentityMergeService.mergeInto(target.userId, placeholder.userId, { tenantId, ipAddress, userAgent });

    // Mint a session for the real account and hand back fresh cookies.
    const reloaded = await UserService.getById(target.userId);
    const userSecurity = await UserSecurityService.getSafeByUserId(target.userId);
    const { rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
      user: reloaded, request: req, userSecurity, otpIgnore: true,
    });

    const response = NextResponse.json({ ok: true, redirect: `/tenant/${tenantId}/admin` });
    const isSecure = req.headers.get('x-forwarded-proto') === 'https';
    const cookieOpts = isSecure
      ? { httpOnly: true, secure: true, sameSite: 'none' as const, path: '/', maxAge: 60 * 60 * 24 * 7 }
      : { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7 };
    response.cookies.set('accessToken', rawAccessToken, cookieOpts);
    response.cookies.set('refreshToken', rawRefreshToken, cookieOpts);
    return response;
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    const message = e instanceof Error ? e.message : 'merge_failed';
    return NextResponse.json({ ok: false, message }, { status });
  }
}
