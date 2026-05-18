import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import TenantMemberService from '@/modules/tenant_member/tenant_member.service';
import ESignatureSettingsService from '@/modules/e_signature/e_signature.settings.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * Returns the tenant-scoped admin view of e_signature settings. Caller must
 * be an active member of the tenant; sensitive values come back masked.
 */
export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { tenantId } = await ctx.params;
    const rl = await Limiter.checkRateLimit(request, 'api');
    if (rl) return rl;

    const auth = await UserSessionNextService.authenticateUserByRequest({ request });
    const member = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: auth.user.userId })
      .catch(() => null);
    if (!member) {
      return NextResponse.json({ success: false, error: { message: 'Not a tenant member' } }, { status: 403 });
    }

    const data = await ESignatureSettingsService.getTenantAdminView(tenantId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load tenant e-signature settings';
    Logger.warn(`tenant e-signature settings GET failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  try {
    const { tenantId } = await ctx.params;
    const rl = await Limiter.checkRateLimit(request, 'api');
    if (rl) return rl;

    const auth = await UserSessionNextService.authenticateUserByRequest({ request });
    const member = await TenantMemberService
      .getByTenantAndUser({ tenantMemberId: null, tenantId, userId: auth.user.userId })
      .catch(() => null);
    if (!member || (member.memberRole !== 'OWNER' && member.memberRole !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: { message: 'Tenant owner/admin role required' } }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const patch = (body?.settings ?? {}) as Record<string, string>;
    await ESignatureSettingsService.updateTenantAdmin(tenantId, patch);

    await AuditLogService.log({
      action: 'admin.e_signature.tenant_settings_update',
      actorType: 'USER',
      actorId: auth.user.userId,
      tenantId,
      resourceType: 'tenant_setting',
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      metadata: { keys: Object.keys(patch) },
    });

    const data = await ESignatureSettingsService.getTenantAdminView(tenantId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save tenant e-signature settings';
    Logger.warn(`tenant e-signature settings PUT failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
