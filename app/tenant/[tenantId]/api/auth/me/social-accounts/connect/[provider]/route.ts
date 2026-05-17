// path: app/tenant/[tenantId]/api/auth/me/social-accounts/connect/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import SSOMessages from '@/modules/auth_sso/auth_sso.messages';
import { SSOProvider, SSOProviderEnum } from '@/modules/auth_sso/auth_sso.enums';
import Limiter from '@/modules_next/limiter/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/auth/me/social-accounts/connect/[provider]
 *
 * Initiate an OAuth flow to LINK a provider to the currently authenticated
 * user from the tenant me page. Mirrors the system-scope endpoint — the social
 * account row itself lives in the system schema either way.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; provider: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    const { tenantId, provider } = await params;
    if (!SSOProviderEnum.options.includes(provider as SSOProvider)) {
      return NextResponse.json({ message: SSOMessages.INVALID_PROVIDER }, { status: 400 });
    }

    if (!SSOService.isProviderEnabled(provider)) {
      return NextResponse.json({ message: SSOMessages.INVALID_PROVIDER }, { status: 400 });
    }

    if (SSOService.isPlaceholderEmail(user.email)) {
      return NextResponse.json(
        { message: 'Add a real email to your account before linking a social provider.' },
        { status: 400 },
      );
    }

    const state = SSOService.signLinkState(user.userId, user.email, `/tenant/${tenantId}/admin/me`);
    const url = SSOService.generateAuthUrl(provider as SSOProvider, state);

    return NextResponse.json({ url, state });
  } catch (error: any) {
    Logger.error('Failed to start tenant SSO link flow:', error);
    return NextResponse.json(
      { message: error.message ?? SSOMessages.OAUTH_ERROR },
      { status: 500 },
    );
  }
}
