// path: app/tenant/[tenantId]/api/marketplace/plugins/[listingId]/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { getPluginConfig, setPluginConfig } from '@kuraykaraaslan/marketplace/server/plugin-config.service.next';

/**
 * One generic endpoint for ANY installed community plugin's per-tenant config.
 *   GET  → declared settings/secrets + current values (secrets as set-status only)
 *   PUT  → { settings?, secrets? } — writes declared keys (secrets encrypted)
 * Admin-only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string; listingId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, listingId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const config = await getPluginConfig(tenantId, listingId);
    if (!config) return NextResponse.json({ success: false, message: 'Plugin is not installed.' }, { status: 404 });
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to load plugin config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ tenantId: string; listingId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, listingId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });

    const body = await request.json().catch(() => ({}));
    const config = await setPluginConfig(
      tenantId,
      listingId,
      { settings: body?.settings ?? {}, secrets: body?.secrets ?? {} },
      user?.userId,
    );
    if (!config) return NextResponse.json({ success: false, message: 'Plugin is not installed.' }, { status: 404 });
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to update plugin config' }, { status: 500 });
  }
}
