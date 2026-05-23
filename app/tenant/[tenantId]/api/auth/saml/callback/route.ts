import { NextRequest, NextResponse } from 'next/server';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import SamlMessages from '@/modules/auth_saml/auth_saml.messages';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import UserSecurityService from '@/modules/user_security/user_security.service';
import TenantMemberService from '@/modules/tenant_member/tenant_member.service';
import TenantService from '@/modules/tenant/tenant.service';
import MailService from '@/modules/notification_mail/notification_mail.service';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import { env } from '@/modules/env';

type Params = { params: Promise<{ tenantId: string }> };

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

export async function POST(req: NextRequest, { params }: Params) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  const { tenantId } = await params;

  try {
    const formData = await req.formData();
    const body: Record<string, string> = {};
    formData.forEach((v, k) => { if (typeof v === 'string') body[k] = v; });

    const isIdpInitiated = !body.RelayState;
    const samlProfile = await SamlService.validateCallback(tenantId, body, isIdpInitiated);

    // Link-from-Connected-Accounts: RelayState carries the signed link-state JWT.
    // We attach the SAML identity to the existing user (email-match enforced) and
    // never mint a new session here — the user is already logged in.
    const linkState = SSOService.parseLinkState(body.RelayState);
    if (linkState) {
      const returnTo = SSOService.safeReturnPath(linkState.r ?? `/tenant/${tenantId}/admin/me`);
      try {
        await SamlService.linkToUser(linkState.uid, linkState.em, samlProfile);
        return NextResponse.redirect(`${APP_HOST}${returnTo}?linked=saml`);
      } catch (err: any) {
        return NextResponse.redirect(
          `${APP_HOST}${returnTo}?linkError=${encodeURIComponent(err?.message ?? SamlMessages.INVALID_RESPONSE)}`,
        );
      }
    }

    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.redirect(`${APP_HOST}/tenant/${tenantId}/auth/login?error=tenant_inactive`);
    }

    // JIT-gated user + membership resolution. Throws NOT_MEMBER when the user
    // is unknown / not a member and the tenant has not opted into JIT.
    const { user, jitProvisioned } = await SamlService.resolveOrProvisionUser(tenantId, samlProfile);

    if (jitProvisioned) {
      try { await MailService.sendWelcomeEmail({ tenantId, email: user.email }); } catch {}
    }

    // Re-check membership status (in case the user is an existing, inactive
    // member — JIT only creates ACTIVE rows, so this branch covers historical
    // suspended / pending memberships).
    const existingMember = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
      .catch(() => null);

    if (existingMember && existingMember.memberStatus !== 'ACTIVE') {
      return NextResponse.redirect(`${APP_HOST}/tenant/${tenantId}/auth/login?error=member_inactive`);
    }

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);
    const { rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
      user,
      request: req,
      userSecurity,
      otpIgnore: true,
    });

    const response = NextResponse.redirect(
      `${APP_HOST}/tenant/${tenantId}/auth/callback?rawAccessToken=${rawAccessToken}&rawRefreshToken=${rawRefreshToken}`,
    );

    const isSecure = req.headers.get('x-forwarded-proto') === 'https';
    const cookieOpts = isSecure
      ? { httpOnly: true, secure: true, sameSite: 'none' as const, path: '/', maxAge: 60 * 60 * 24 * 7 }
      : { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7 };

    response.cookies.set('accessToken', rawAccessToken, cookieOpts);
    response.cookies.set('refreshToken', rawRefreshToken, cookieOpts);

    return response;
  } catch (e: any) {
    return NextResponse.redirect(
      `${APP_HOST}/tenant/${tenantId}/auth/login?error=${encodeURIComponent(e.message)}`,
    );
  }
}
