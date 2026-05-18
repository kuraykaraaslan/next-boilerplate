import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next';
import ESignatureSettingsService from '@/modules/e_signature/e_signature.settings.service';
import ESignatureService from '@/modules/e_signature/e_signature.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';

export async function GET(request: NextRequest) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'api');
    if (rl) return rl;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' });

    const settings = await ESignatureSettingsService.getAdminView();
    const providers = ESignatureService.listProvidersAdmin();
    return NextResponse.json({ success: true, data: { settings, providers } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load e-signature settings';
    Logger.warn(`e-signature settings GET failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await Limiter.checkRateLimit(request, 'api');
    if (rl) return rl;

    const auth = await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' });

    const body = await request.json().catch(() => ({}));
    const patch = (body?.settings ?? {}) as Record<string, string>;
    await ESignatureSettingsService.updateAdmin(patch);

    await AuditLogService.log({
      action: 'admin.e_signature.settings_update',
      actorType: 'USER',
      actorId: auth.user.userId,
      resourceType: 'system_setting',
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      metadata: {
        keys: Object.keys(patch),
      },
    });

    const settings = await ESignatureSettingsService.getAdminView();
    const providers = ESignatureService.listProvidersAdmin();
    return NextResponse.json({ success: true, data: { settings, providers } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save e-signature settings';
    Logger.warn(`e-signature settings PUT failed: ${message}`);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
