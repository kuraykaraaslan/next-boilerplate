import { NextRequest, NextResponse } from 'next/server';
import AuthPolicyService from '@/modules/auth/auth.policy.service';
import AuthMessages from '@/modules/auth/auth.messages';
import UserSecurityService from '@/modules/user_security/user_security.service';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import type { SafeUser } from '@/modules/user/user.types';
import type { SafeUserSession } from '@/modules/user_session/user_session.types';
import type { SafeUserSecurity } from '@/modules/user_security/user_security.types';

function clientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || undefined
  );
}

/**
 * KD-13: gate admin surfaces behind an IP allowlist and (optionally) an MFA
 * enrolment check. Call this at the top of any system/admin route handler
 * that has already resolved the requesting user's role to SUPER_ADMIN/ADMIN.
 *
 * Returns a 403 NextResponse if the request should be rejected, or null
 * when the caller may proceed. Designed to be cheap — policy reads are cached
 * via SettingService's Redis cache.
 */
export async function enforceAdminAccess(
  request: NextRequest,
  userSecurity: SafeUserSecurity | null,
): Promise<NextResponse | null> {
  const policy = await AuthPolicyService.getAdminPolicy();
  const ip = clientIp(request);

  if (!AuthPolicyService.isAdminIpAllowed(ip, policy)) {
    return NextResponse.json(
      { error: AuthMessages.ADMIN_IP_NOT_ALLOWED },
      { status: 403 },
    );
  }

  if (policy.requireMfa) {
    const enrolled = (userSecurity?.otpMethods?.length ?? 0) > 0
      || userSecurity?.passkeyEnabled === true;
    if (!enrolled) {
      return NextResponse.json(
        { error: AuthMessages.MFA_ENROLLMENT_REQUIRED },
        { status: 403 },
      );
    }
  }

  return null;
}

export type AdminAuthResult =
  | { ok: true; user: SafeUser; userSession: SafeUserSession; userSecurity: SafeUserSecurity }
  | { ok: false; response: NextResponse };

/**
 * Single-call helper for admin API routes: resolves the session, enforces
 * role, and applies the KD-13 IP/MFA guard in one go.
 *
 * Usage:
 *   const auth = await authenticateAdminRequest(request);
 *   if (!auth.ok) return auth.response;
 *   const { user, userSession } = auth;
 */
export async function authenticateAdminRequest(
  request: NextRequest,
  options: { requiredRole?: 'ADMIN' | 'SUPER_ADMIN' } = {},
): Promise<AdminAuthResult> {
  let user: SafeUser;
  let userSession: SafeUserSession;
  try {
    const result = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: (options.requiredRole ?? 'ADMIN') as 'ADMIN',
    });
    if (!result || !result.user) {
      return { ok: false, response: NextResponse.json({ error: AuthMessages.USER_NOT_AUTHENTICATED }, { status: 401 }) };
    }
    user = result.user;
    userSession = result.userSession;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'USER_NOT_AUTHENTICATED';
    const status = msg === AuthMessages.USER_DOES_NOT_HAVE_REQUIRED_ROLE ? 403 : 401;
    return { ok: false, response: NextResponse.json({ error: msg }, { status }) };
  }

  const userSecurity = await UserSecurityService.getSafeByUserId(user.userId).catch(() => null);
  const denied = await enforceAdminAccess(request, userSecurity);
  if (denied) return { ok: false, response: denied };

  return { ok: true, user, userSession, userSecurity: userSecurity! };
}
