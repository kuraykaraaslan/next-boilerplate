// path: app/tenant/[tenantId]/api/auth/me/social-accounts/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@nb/user_session/server/user_session.service.next';
import UserSocialAccountService from '@nb/user_social_account/server/user_social_account.service';
import { SocialAccountProviderEnum } from '@nb/user_social_account/server/user_social_account.enums';
import Limiter from '@nb/limiter/server/limiter.service.next';

/**
 * DELETE /tenant/[tenantId]/api/auth/me/social-accounts/[provider]
 * Unlink a social account from the current user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    const { provider: rawProvider } = await params;
    // Government providers are keyed with a colon (`acs:tr_edevlet`) and arrive
    // URL-encoded from the client; decode before validating against the enum.
    const provider = decodeURIComponent(rawProvider);
    const parsed = SocialAccountProviderEnum.safeParse(provider);
    if (!parsed.success) {
      return NextResponse.json({ message: `Invalid provider: ${provider}` }, { status: 400 });
    }

    await UserSocialAccountService.unlink(user.userId, parsed.data);

    return NextResponse.json({ message: `${provider} account unlinked` }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
