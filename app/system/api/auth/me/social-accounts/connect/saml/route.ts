// path: app/system/api/auth/me/social-accounts/connect/saml/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import SamlMessages from '@/modules/auth_saml/auth_saml.messages';
import Limiter from '@/modules_next/limiter/limiter.service.next';

/**
 * GET /system/api/auth/me/social-accounts/connect/saml
 *
 * Initiate a SAML auth flow to LINK the system-scope IdP identity to the
 * currently authenticated user. The link-state JWT travels via RelayState;
 * the system SAML ACS route parses it and enforces the email match.
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    if (SSOService.isPlaceholderEmail(user.email)) {
      return NextResponse.json(
        { message: 'Add a real email to your account before linking a SAML identity.' },
        { status: 400 },
      );
    }

    const state = SSOService.signLinkState(user.userId, user.email, '/system/admin/me');
    const url = await SamlService.generateSystemAuthUrl(state);

    return NextResponse.json({ url, state });
  } catch (error: any) {
    Logger.error('Failed to start system SAML link flow:', error);
    return NextResponse.json(
      { message: error.message ?? SamlMessages.SYSTEM_NOT_CONFIGURED },
      { status: 500 },
    );
  }
}
