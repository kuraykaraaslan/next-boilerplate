import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
// path: app/tenant/[tenantId]/api/settings/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import TenantService from '@kuraykaraaslan/tenant/server/tenant.service';
import { TENANT_BRANDING_KEYS } from '@kuraykaraaslan/tenant_branding/server/tenant_branding.setting.keys'
import { PUBLIC_CACHE } from '@kuraykaraaslan/common/server/utils/cacheHeaders'


/**
 * GET /tenant/[tenantId]/api/settings/public
 * Get public tenant settings (no authentication required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {

  const PUBLIC_SETTINGS_KEYS = [
    ...TENANT_BRANDING_KEYS,
    // Add other public setting keys here as needed
  ];  
  
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { tenantId } = await params;
    const [settings, tenant] = await Promise.all([
      SettingService.getByKeys(tenantId, PUBLIC_SETTINGS_KEYS),
      TenantService.getById(tenantId).catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      settings,
      tenant: tenant ? { name: tenant.name } : null,
    }, { status: 200, headers: PUBLIC_CACHE.long });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
