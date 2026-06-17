// path: app/tenant/[tenantId]/api/admin-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import {
  UpdateSettingsDTO,
  GetSettingsResponseDTO,
  UpdateSettingsResponseDTO,
} from '@kuraykaraaslan/setting/server/setting.dto';
import SettingMessages from '@kuraykaraaslan/setting/server/setting.messages';

/**
 * GET /tenant/[tenantId]/api/admin-settings
 *
 * Tenant integration / provider configuration (Email, SMS, Storage, Payment,
 * AI, Auth, Security, Notifications). Each tenant owns its own row in the
 * shared `settings` table — what used to be platform-wide super-admin config
 * is now per-tenant. Admin-only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    const settings = await SettingService.getAllAsRecord(tenantId);
    const response = { success: true, settings };
    GetSettingsResponseDTO.parse(response);
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.FETCH_FAILED },
      { status: 500 },
    );
  }
}

async function updateSettings(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    });

    const body = await request.json();
    const parsedData = UpdateSettingsDTO.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedData.error.issues.map((err) => err.message).join(', '),
        },
        { status: 400 },
      );
    }

    const { settings } = parsedData.data;
    const updatedArr = await SettingService.updateMany(tenantId, settings);

    const updatedSettings: Record<string, string> = {};
    for (const s of updatedArr) {
      updatedSettings[s.key] = s.value;
    }

    const response = { success: true, settings: updatedSettings };
    UpdateSettingsResponseDTO.parse(response);
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.UPDATE_FAILED },
      { status: 500 },
    );
  }
}

export const PUT = updateSettings;
export const POST = updateSettings;
