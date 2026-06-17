import { NextRequest, NextResponse } from 'next/server';
import SamlService from '@kuraykaraaslan/auth_saml/server/auth_saml.service';
import SamlMessages from '@kuraykaraaslan/auth_saml/server/auth_saml.messages';
import SSOService from '@kuraykaraaslan/auth_sso/server/auth_sso.service';
import UserSessionNextService from '@kuraykaraaslan/user_session/server/user_session.service.next';
import UserSecurityService from '@kuraykaraaslan/user_security/server/user_security.service';
import TenantMemberService from '@kuraykaraaslan/tenant_member/server/tenant_member.service';
import TenantService from '@kuraykaraaslan/tenant/server/tenant.service';
import MailTemplatesService from '@kuraykaraaslan/notification_mail/server/notification_mail.templates.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { env } from '@kuraykaraaslan/env';

type Params = { params: Promise<{ tenantId: string }> };

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

export async function POST(req: NextRequest, { params }: Params) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  const { tenantId } = await params;

  // Captured up-front so both the success path and the catch-all failure path
  // can attribute the audit row to the originating client.
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;

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
      await AuditLogService.log({
        tenantId,
        actorType: 'SYSTEM',
        action: 'saml.login_failed',
        metadata: { reason: 'tenant_inactive', email: samlProfile.email },
        ipAddress,
        userAgent,
      });
      return NextResponse.redirect(`${APP_HOST}/tenant/${tenantId}/auth/login?error=tenant_inactive`);
    }

    // JIT-gated user + membership resolution. Throws NOT_MEMBER when the user
    // is unknown / not a member and the tenant has not opted into JIT.
    const { user, jitProvisioned } = await SamlService.resolveOrProvisionUser(tenantId, samlProfile);

    if (jitProvisioned) {
      try { await MailTemplatesService.sendWelcomeEmail({ tenantId, email: user.email }); } catch {}
    }

    // Re-check membership status (in case the user is an existing, inactive
    // member — JIT only creates ACTIVE rows, so this branch covers historical
    // suspended / pending memberships).
    const existingMember = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
      .catch(() => null);

    if (existingMember && existingMember.memberStatus !== 'ACTIVE') {
      await AuditLogService.log({
        tenantId,
        actorType: 'USER',
        actorId: user.userId,
        action: 'saml.login_failed',
        resourceType: 'user',
        resourceId: user.userId,
        metadata: { reason: 'member_inactive', email: user.email },
        ipAddress,
        userAgent,
      });
      return NextResponse.redirect(`${APP_HOST}/tenant/${tenantId}/auth/login?error=member_inactive`);
    }

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);
    const { rawAccessToken, rawRefreshToken } = await UserSessionNextService.createSession({
      user,
      request: req,
      userSecurity,
      otpIgnore: true,
    });

    await AuditLogService.log({
      tenantId,
      actorType: 'USER',
      actorId: user.userId,
      action: 'saml.login_success',
      resourceType: 'user',
      resourceId: user.userId,
      metadata: { email: user.email, nameId: samlProfile.nameId, jitProvisioned },
      ipAddress,
      userAgent,
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
    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'saml.login_failed',
      metadata: { reason: e?.message ?? 'unknown' },
      ipAddress,
      userAgent,
    });
    return NextResponse.redirect(
      `${APP_HOST}/tenant/${tenantId}/auth/login?error=${encodeURIComponent(e.message)}`,
    );
  }
}
