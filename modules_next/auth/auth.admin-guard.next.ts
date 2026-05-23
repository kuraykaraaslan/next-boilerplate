import { NextRequest, NextResponse } from 'next/server';
import AuthPolicyService from '@/modules/auth/auth.policy.service';
import AuthMessages from '@/modules/auth/auth.messages';
import UserSecurityService from '@/modules/user_security/user_security.service';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import type { SafeUser } from '@/modules/user/user.types';
import type { SafeUserSession } from '@/modules/user_session/user_session.types';
import type { SafeUserSecurity } from '@/modules/user_security/user_security.types';
import type { SafeTenant } from '@/modules/tenant/tenant.types';
import type { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';

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
  | {
      ok: true;
      user: SafeUser;
      userSession: SafeUserSession;
      userSecurity: SafeUserSecurity;
      tenant: SafeTenant;
      tenantMember: SafeTenantMember;
    }
  | { ok: false; response: NextResponse };

/**
 * Single-call helper for admin API routes: resolves the session against the
 * root tenant, enforces root-tenant membership at the requested role, and
 * applies the KD-13 IP/MFA guard in one go.
 *
 * Super-admin = a TenantMember of the root tenant with memberRole satisfying
 * `requiredRole` (default 'ADMIN'). The legacy `userRole === 'ADMIN'` gate
 * is gone; identity now flows through the unified tenant-membership model.
 *
 * Usage:
 *   const auth = await authenticateAdminRequest(request);
 *   if (!auth.ok) return auth.response;
 *   const { user, userSession, tenant, tenantMember } = auth;
 */
export async function authenticateAdminRequest(
  request: NextRequest,
  options: { requiredRole?: TenantMemberRole } = {},
): Promise<AdminAuthResult> {
  let result;
  try {
    result = await TenantSessionNextService.authenticateRootTenantAdmin({
      request,
      requiredRole: options.requiredRole ?? 'ADMIN',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : AuthMessages.USER_NOT_AUTHENTICATED;
    const status =
      msg === AuthMessages.USER_DOES_NOT_HAVE_REQUIRED_ROLE
      || msg.includes('INSUFFICIENT')
      || msg.includes('NOT_MEMBER')
        ? 403
        : 401;
    return { ok: false, response: NextResponse.json({ error: msg }, { status }) };
  }

  const userSecurity = await UserSecurityService.getSafeByUserId(result.user.userId).catch(() => null);
  const denied = await enforceAdminAccess(request, userSecurity);
  if (denied) return { ok: false, response: denied };

  return {
    ok: true,
    user: result.user,
    userSession: result.userSession,
    userSecurity: userSecurity!,
    tenant: result.tenant,
    tenantMember: result.tenantMember,
  };
}
