// path: app/tenant/[tenantId]/api/auth/me/security/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import Logger from '@kuraykaraaslan/logger';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import UserSecurityService from '@kuraykaraaslan/user_security/server/user_security.service';
import AuthMessages from '@kuraykaraaslan/auth/server/auth.messages';

/**
 * GET /tenant/[tenantId]/api/auth/me/security
 * Tenant-scoped /api/auth/me endpoint.
 * Returns the current user's security overview (email-verified, role, last-login).
 * Tenant membership is enforced — any active member can read their own record.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const userSecurity = await UserSecurityService.getSafeByUserId(user.userId);

    return NextResponse.json({
      message: AuthMessages.SECURITY_SETTINGS_RETRIEVED,
      userSecurity,
    });
  } catch (err: any) {
    Logger.error('Get Security Error:');
    return NextResponse.json(
      { message: err.message || AuthMessages.SECURITY_SETTINGS_RETRIEVED },
      { status: 500 },
    );
  }
}
