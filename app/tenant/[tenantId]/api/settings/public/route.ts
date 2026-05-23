import Limiter from '@/modules_next/limiter/limiter.service.next';
// path: app/tenant/[tenantId]/api/settings/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import SettingService from '@/modules/setting/setting.service';
import { TENANT_BRANDING_KEYS } from '@/modules/tenant_branding/tenant_branding.setting.keys'


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
    const settings = await SettingService.getByKeys(tenantId, PUBLIC_SETTINGS_KEYS);

    return NextResponse.json({
      success: true,
      settings
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
