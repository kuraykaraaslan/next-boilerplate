// path: app/tenant/[tenantId]/api/settings/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@/modules/setting/setting.service";
import { TENANT_BRANDING_KEYS } from '@/modules/tenant_branding/tenant_branding.setting.keys'


/**
 * GET /tenant/[tenantId]/api/settings/public
 * Get public tenant settings (no authentication required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {

  const PUBLIC_SETTINGS_KEYS = [
    ...TENANT_BRANDING_KEYS,
    // Add other public setting keys here as needed
  ];  
  
  try {
    const { tenantId } = await params;
    const settings = await SettingService.getByKeys(PUBLIC_SETTINGS_KEYS, tenantId);

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
