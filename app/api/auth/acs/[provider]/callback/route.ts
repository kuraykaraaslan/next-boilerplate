import { NextRequest, NextResponse } from 'next/server';
import AuthAcsService from '@/modules/auth_acs/auth_acs.service';
import AcsMessages from '@/modules/auth_acs/auth_acs.messages';
import { parseAcsRelay } from '@/modules/auth_acs/auth_acs.relay';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import UserSecurityService from '@/modules/user_security/user_security.service';
import TenantMemberService from '@/modules/tenant_member/tenant_member.service';
import TenantService from '@/modules/tenant/tenant.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import { env } from '@/modules/env';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';

type Params = { params: Promise<{ provider: string }> };

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

/** SAML providers post the assertion (HTTP-POST binding). */
export async function POST(req: NextRequest, { params }: Params) {
  const formData = await req.formData();
  const body: Record<string, string> = {};
  formData.forEach((v, k) => { if (typeof v === 'string') body[k] = v; });
  return handleCallback(req, params, body, body.RelayState);
}

/** OIDC providers redirect back with ?code&state. */
export async function GET(req: NextRequest, { params }: Params) {
  const url = new URL(req.url);
  const body: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { body[k] = v; });
  return handleCallback(req, params, body, body.state);
}

async function handleCallback(
  req: NextRequest,
  params: Params['params'],
  body: Record<string, string>,
  relayToken: string | undefined,
) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  const { provider: raw } = await params;
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;

  // Resolve tenant context early so even failures redirect somewhere sensible.
  const linkState = SSOService.parseLinkState(relayToken);
  const relay = linkState ? null : parseAcsRelay(relayToken);
  const tenantId = linkState?.t ?? relay?.tenantId ?? null;
  const loginRedirect = `${APP_HOST}/tenant/${tenantId ?? ROOT_TENANT_ID}/auth/login`;

  try {
    const provider = AuthAcsService.assertKnown(raw);

    // ── Connected-accounts link flow ───────────────────────────────────────
    if (linkState) {
      const returnTo = SSOService.safeReturnPath(linkState.r, linkState.t);
      try {
        const profile = await AuthAcsService.validateCallback(provider, body);
        await AuthAcsService.linkToUser(linkState.uid, profile);
        return NextResponse.redirect(`${APP_HOST}${returnTo}?linked=acs:${provider}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : AcsMessages.INVALID_RESPONSE;
        return NextResponse.redirect(`${APP_HOST}${returnTo}?linkError=${encodeURIComponent(msg)}`);
      }
    }

    // ── Login flow ─────────────────────────────────────────────────────────
    if (tenantId) {
      const tenant = await TenantService.getById(tenantId).catch(() => null);
      if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
        return NextResponse.redirect(`${loginRedirect}?error=tenant_inactive`);
      }
    }

    const { user, isNewUser } = await AuthAcsService.authenticate(provider, body, { tenantId, ipAddress, userAgent });

    // Reject historically suspended/pending memberships (JIT only creates ACTIVE).
    if (tenantId) {
      const member = await TenantMemberService
        .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
        .catch(() => null);
      if (member && member.memberStatus !== 'ACTIVE') {
        return NextResponse.redirect(`${loginRedirect}?error=member_inactive`);
      }
    }

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);
    const { rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
      user, request: req, userSecurity, otpIgnore: true,
    });

    await AuditLogService.log({
      tenantId: tenantId ?? null, actorType: 'USER', actorId: user.userId,
      action: 'acs.login_success', resourceType: 'user', resourceId: user.userId,
      metadata: { provider, isNewUser }, ipAddress, userAgent,
    }).catch(() => {});

    const tid = tenantId ?? ROOT_TENANT_ID;
    // New users hold a synthetic placeholder email → send them to complete-profile
    // (add a real email and/or merge into an existing account) before anything else.
    const dest = isNewUser
      ? `${APP_HOST}/tenant/${tid}/auth/complete-profile?rawAccessToken=${rawAccessToken}&rawRefreshToken=${rawRefreshToken}`
      : `${APP_HOST}/tenant/${tid}/auth/callback?rawAccessToken=${rawAccessToken}&rawRefreshToken=${rawRefreshToken}`;
    const response = NextResponse.redirect(dest);

    const isSecure = req.headers.get('x-forwarded-proto') === 'https';
    const cookieOpts = isSecure
      ? { httpOnly: true, secure: true, sameSite: 'none' as const, path: '/', maxAge: 60 * 60 * 24 * 7 }
      : { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7 };
    response.cookies.set('accessToken', rawAccessToken, cookieOpts);
    response.cookies.set('refreshToken', rawRefreshToken, cookieOpts);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'acs_login_failed';
    await AuditLogService.log({
      tenantId: tenantId ?? null, actorType: 'SYSTEM', action: 'acs.login_failed',
      metadata: { provider: raw, reason: msg }, ipAddress, userAgent,
    }).catch(() => {});
    return NextResponse.redirect(`${loginRedirect}?error=${encodeURIComponent(msg)}`);
  }
}
