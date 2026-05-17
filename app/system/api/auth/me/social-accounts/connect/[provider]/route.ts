// path: app/system/api/auth/me/social-accounts/connect/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import SSOService from '@/modules/auth_sso/auth_sso.service';
import SSOMessages from '@/modules/auth_sso/auth_sso.messages';
import { SSOProvider, SSOProviderEnum } from '@/modules/auth_sso/auth_sso.enums';
import Limiter from '@/modules_next/limiter/limiter.service.next';

/**
 * GET /system/api/auth/me/social-accounts/connect/[provider]
 *
 * Initiate an OAuth flow to LINK a provider to the currently authenticated user.
 * Returns the OAuth authorization URL with a signed link-state JWT.
 *
 * Email-match guard is enforced at the callback (SSOService.linkToUser).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'auth');
    if (_rl) return _rl;

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    const { provider } = await params;
    if (!SSOProviderEnum.options.includes(provider as SSOProvider)) {
      return NextResponse.json({ message: SSOMessages.INVALID_PROVIDER }, { status: 400 });
    }

    if (!SSOService.isProviderEnabled(provider)) {
      return NextResponse.json({ message: SSOMessages.INVALID_PROVIDER }, { status: 400 });
    }

    // Refuse to start a link flow for a placeholder-email account — the email-match
    // guard would always fail. The user must add a real email to their account first.
    if (SSOService.isPlaceholderEmail(user.email)) {
      return NextResponse.json(
        { message: 'Add a real email to your account before linking a social provider.' },
        { status: 400 },
      );
    }

    const state = SSOService.signLinkState(user.userId, user.email);
    const url = SSOService.generateAuthUrl(provider as SSOProvider, state);

    return NextResponse.json({ url, state });
  } catch (error: any) {
    Logger.error('Failed to start SSO link flow:', error);
    return NextResponse.json(
      { message: error.message ?? SSOMessages.OAUTH_ERROR },
      { status: 500 },
    );
  }
}
