import { NextRequest, NextResponse } from 'next/server';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import UserService from '@/modules/user/user.service';
import { SafeUserSchema } from '@/modules/user/user.types';
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

    const tenant = await TenantService.getById(tenantId);
    if (!tenant || tenant.tenantStatus !== 'ACTIVE') {
      return NextResponse.redirect(`${APP_HOST}/tenant/${tenantId}/auth/login?error=tenant_inactive`);
    }

    const existingRaw = await UserService.getByEmail(samlProfile.email);

    let user = existingRaw ? SafeUserSchema.parse(existingRaw) : null;

    if (!user) {
      const created = await UserService.create({
        email: samlProfile.email,
        password: `saml_${Date.now()}_${Math.random().toString(36)}`,
      });
      await MailService.sendWelcomeEmail({ email: created.email });
      user = created;
    }

    // Auto-provision tenant membership if not already a member
    const existingMember = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: user.userId })
      .catch(() => null);

    if (!existingMember) {
      await TenantMemberService.create({
        tenantId,
        userId: user.userId,
        memberRole: 'USER',
        memberStatus: 'ACTIVE',
      });
    } else if (existingMember.memberStatus !== 'ACTIVE') {
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
