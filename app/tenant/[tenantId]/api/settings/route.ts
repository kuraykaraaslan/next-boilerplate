// path: app/tenant/[tenantId]/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@nb/tenant_session/server/tenant_session.service.next";
import SettingService from '@nb/setting/server/setting.service';
import SettingMessages from "@nb/setting/server/setting.messages";
import Limiter from "@nb/limiter/server/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/settings
 * Get all tenant settings (requires ADMIN role)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const settings = await SettingService.getAllAsRecord(tenantId);

    return NextResponse.json({
      success: true,
      settings
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.FETCH_FAILED },
      { status: 500 }
    );
  }
}

/**
 * PUT /tenant/[tenantId]/api/settings
 * Get tenant settings by keys (requires ADMIN role)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const body = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys)) {
      return NextResponse.json({
        success: false,
        message: "Keys array is required"
      }, { status: 400 });
    }

    const settings = await SettingService.getByKeys(tenantId, keys);

    return NextResponse.json({
      success: true,
      settings
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.FETCH_FAILED },
      { status: 500 }
    );
  }
}

/**
 * POST /tenant/[tenantId]/api/settings
 * Update tenant settings (requires ADMIN role)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId
    });

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({
        success: false,
        message: "Settings object is required"
      }, { status: 400 });
    }

    const updatedArr = await SettingService.updateMany(tenantId, settings);

    // Convert to key-value object
    const updatedSettings: Record<string, string> = {};
    for (const s of updatedArr) {
      updatedSettings[s.key] = s.value;
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.UPDATE_FAILED },
      { status: 500 }
    );
  }
}

/**
 * DELETE /tenant/[tenantId]/api/settings
 * Delete a tenant setting (requires OWNER role)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "OWNER",
      tenantId
    });

    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({
        success: false,
        message: "Setting key is required"
      }, { status: 400 });
    }

    const deleted = await SettingService.delete(tenantId, key);

    if (!deleted) {
      return NextResponse.json({
        success: false,
        message: SettingMessages.SETTING_NOT_FOUND
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: SettingMessages.SETTING_DELETED
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SettingMessages.DELETE_FAILED },
      { status: 500 }
    );
  }
}
