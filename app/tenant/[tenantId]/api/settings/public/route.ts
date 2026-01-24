// path: app/tenant/[tenantId]/api/settings/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSettingService from "@/modules/tenant_setting/tenant_setting.service";

// Public settings keys that don't require authentication
const PUBLIC_SETTINGS_KEYS = [
  'name',
  'logo',
  'primaryColor',
  'backgroundImage',
  'siteName',
  'siteDescription',
  'faviconUrl',
];

/**
 * GET /tenant/[tenantId]/api/settings/public
 * Get public tenant settings (no authentication required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const settings = await TenantSettingService.getByKeys(tenantId, PUBLIC_SETTINGS_KEYS);

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
