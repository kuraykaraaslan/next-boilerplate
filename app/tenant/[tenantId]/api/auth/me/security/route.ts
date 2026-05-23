// path: app/tenant/[tenantId]/api/auth/me/security/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import Logger from '@/modules/logger';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import UserSecurityService from '@/modules/user_security/user_security.service';
import AuthMessages from '@/modules/auth/auth.messages';

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
