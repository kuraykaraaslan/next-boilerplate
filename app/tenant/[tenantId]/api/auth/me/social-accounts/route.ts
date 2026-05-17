// path: app/tenant/[tenantId]/api/auth/me/social-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import UserSocialAccountService from '@/modules/user_social_account/user_social_account.service';
import Limiter from '@/modules_next/limiter/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/auth/me/social-accounts
 *
 * List federated identities linked to the current user. Social accounts live in
 * the system schema (one user can be a member of many tenants), so this returns
 * the same list as the system endpoint — the route exists per-tenant only so the
 * panel can run in tenant scope without crossing scope boundaries.
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const { user } = await UserSessionNextService.authenticateUserByRequest({ request });

    const accounts = await UserSocialAccountService.getByUserId(user.userId);

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
