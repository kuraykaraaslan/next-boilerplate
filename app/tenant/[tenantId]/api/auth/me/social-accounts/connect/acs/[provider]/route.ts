// path: app/tenant/[tenantId]/api/auth/me/social-accounts/connect/acs/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Logger from '@nb/logger';
import UserSessionNextService from '@nb/user_session/server/user_session.service.next';
import SSOService from '@nb/auth_sso/server/auth_sso.service';
import AuthAcsService from '@nb/auth_acs/server/auth_acs.service';
import AcsMessages from '@nb/auth_acs/server/auth_acs.messages';
import Limiter from '@nb/limiter/server/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/auth/me/social-accounts/connect/acs/[provider]
 *
 * Start a national-identity (ACS) flow to LINK that identity to the currently
 * authenticated user. The link-state JWT rides in RelayState/state and is parsed
 * by the platform ACS callback, which performs the link (national-id uniqueness
 * enforced by the (provider, providerId) constraint).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; provider: string }> },
) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'auth');
    if (rl) return rl;

    const { tenantId, provider: raw } = await params;
    const provider = AuthAcsService.assertKnown(raw);
    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    if (!AuthAcsService.isEnabled(provider)) {
      return NextResponse.json({ message: AcsMessages.NOT_ENABLED }, { status: 400 });
    }

    const state = SSOService.signLinkState(user.userId, user.email, `/tenant/${tenantId}/admin/me`, tenantId);
    const url = await AuthAcsService.generateAuthUrl(provider, state);
    return NextResponse.json({ url, state });
  } catch (error: any) {
    Logger.error('Failed to start ACS link flow:', error);
    return NextResponse.json({ message: error?.message ?? AcsMessages.NOT_CONFIGURED }, { status: 500 });
  }
}
