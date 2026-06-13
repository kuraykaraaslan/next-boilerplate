import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import SettingService from '@/modules/setting/setting.service';
import { UpdateModerationSettingsDTO } from '@/modules/messaging/messaging.dto';
import {
  MESSAGING_MODERATION_KEYS,
  MESSAGING_MODERATION_DEFAULTS,
} from '@/modules/messaging/messaging.moderation.setting.keys';

/**
 * GET /tenant/[tenantId]/api/messaging/moderation/settings
 * Current moderation policy settings (defaults applied for unset keys) (ADMIN+).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const stored = await SettingService.getByKeys(tenantId, MESSAGING_MODERATION_KEYS);
    const settings = Object.fromEntries(
      MESSAGING_MODERATION_KEYS.map((k) => [k, stored[k] ?? MESSAGING_MODERATION_DEFAULTS[k]]),
    );
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}

/**
 * PUT /tenant/[tenantId]/api/messaging/moderation/settings
 * Update one or more moderation settings (ADMIN+).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    const body = await request.json();
    const parsed = UpdateModerationSettingsDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    await SettingService.updateMany(tenantId, parsed.data, { actorId: user.userId });
    const stored = await SettingService.getByKeys(tenantId, MESSAGING_MODERATION_KEYS);
    const settings = Object.fromEntries(
      MESSAGING_MODERATION_KEYS.map((k) => [k, stored[k] ?? MESSAGING_MODERATION_DEFAULTS[k]]),
    );
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string; statusCode?: number };
    return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 500 });
  }
}
