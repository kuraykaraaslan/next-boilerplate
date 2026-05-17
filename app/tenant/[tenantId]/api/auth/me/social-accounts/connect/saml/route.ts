// path: app/tenant/[tenantId]/api/auth/me/social-accounts/connect/saml/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import SamlService from '@/modules/auth_saml/auth_saml.service';
import SamlMessages from '@/modules/auth_saml/auth_saml.messages';
import Limiter from '@/modules_next/limiter/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/auth/me/social-accounts/connect/saml
 *
 * Initiate a tenant SAML auth flow to LINK the tenant's IdP identity to the
 * currently authenticated user. The link-state JWT travels via RelayState
 * and is parsed by the existing tenant SAML ACS, which then performs an
 * email-match check and the link.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const { tenantId } = await params;
    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    if (SSOService.isPlaceholderEmail(user.email)) {
      return NextResponse.json(
        { message: 'Add a real email to your account before linking a SAML identity.' },
        { status: 400 },
      );
    }

    if (!(await SamlService.isTenantEnabled(tenantId))) {
      return NextResponse.json(
        { message: SamlMessages.NOT_ENABLED },
        { status: 400 },
      );
    }

    const state = SSOService.signLinkState(user.userId, user.email);
    const url = await SamlService.generateAuthUrl(tenantId, state);

    return NextResponse.json({ url, state });
  } catch (error: any) {
    Logger.error('Failed to start tenant SAML link flow:', error);
    return NextResponse.json(
      { message: error.message ?? SamlMessages.NOT_CONFIGURED },
      { status: 500 },
    );
  }
}
