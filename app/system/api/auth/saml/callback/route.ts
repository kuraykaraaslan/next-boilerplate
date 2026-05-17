// path: app/system/api/auth/saml/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/modules/env';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import SamlMessages from '@/modules/auth_saml/auth_saml.messages';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import Limiter from '@/modules_next/limiter/limiter.service.next';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

/**
 * POST /system/api/auth/saml/callback
 *
 * Assertion Consumer Service for the system-scope SAML IdP. Currently only
 * the LINK flow is supported here — a sign-in flow would go through the
 * existing tenant SAML callback because system has no concept of "members".
 * When `RelayState` is a valid link-state JWT we attach the SAML identity
 * to the authenticated user (email-match enforced) and redirect to /me.
 */
export async function POST(req: NextRequest) {
  const rl = await Limiter.checkRateLimit(req, 'auth');
  if (rl) return rl;

  try {
    const formData = await req.formData();
    const body: Record<string, string> = {};
    formData.forEach((v, k) => { if (typeof v === 'string') body[k] = v; });

    const isIdpInitiated = !body.RelayState;
    const samlProfile = await SamlService.validateSystemCallback(body, isIdpInitiated);

    const linkState = SSOService.parseLinkState(body.RelayState);
    if (!linkState) {
      // No valid link-state RelayState — system SAML doesn't support standalone
      // sign-in (no system tenant model), so reject IdP-initiated assertions.
      return NextResponse.redirect(
        `${APP_HOST}/system/admin/me?linkError=${encodeURIComponent('System SAML is link-only.')}`,
      );
    }

    const returnTo = SSOService.safeReturnPath(linkState.r);
    try {
      await SamlService.linkToUser(linkState.uid, linkState.em, samlProfile);
      return NextResponse.redirect(`${APP_HOST}${returnTo}?linked=saml`);
    } catch (err: any) {
      return NextResponse.redirect(
        `${APP_HOST}${returnTo}?linkError=${encodeURIComponent(err?.message ?? SamlMessages.INVALID_RESPONSE)}`,
      );
    }
  } catch (e: any) {
    return NextResponse.redirect(
      `${APP_HOST}/system/admin/me?linkError=${encodeURIComponent(e?.message ?? SamlMessages.INVALID_RESPONSE)}`,
    );
  }
}
