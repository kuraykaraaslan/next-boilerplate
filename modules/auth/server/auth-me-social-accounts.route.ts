// path: app/tenant/[tenantId]/api/auth/me/social-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@kuraykaraaslan/user_session/server/user_session.service.next';
import UserSocialAccountService from '@kuraykaraaslan/user_social_account/server/user_social_account.service';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/auth/me/social-accounts
 *
 * List federated identities linked to the current user. Social accounts live in
 * the system schema (one user can be a member of many tenants), so this returns
 * the same list as the system endpoint — the route exists per-tenant only so the
 * panel can run in tenant scope without crossing scope boundaries.
 *
 * Each account is enriched (kind/group/displayName/icon + OAuth token health) so
 * one panel can render social, enterprise SAML and government identities alike.
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    const accounts = await UserSocialAccountService.listConnectedAccounts(user.userId);

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
