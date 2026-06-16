import { NextRequest, NextResponse } from 'next/server';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import TenantExportService from '@nb/tenant_export/server/tenant_export.service';
import Limiter from '@nb/limiter/server/limiter.service.next';
import Logger from '@nb/logger';

/**
 * POST /tenant/[tenantId]/api/export
 *
 * GDPR Art. 20 — data portability export. Returns a JSON file containing all
 * tenant data (members, domains, audit logs, webhooks, settings).
 *
 * Requires OWNER role. Signing secrets and user passwords are excluded.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'OWNER',
      tenantId,
    });

    const exportBuffer = await TenantExportService.exportTenantData(tenantId);

    const filename = `tenant-export-${tenantId}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(new Uint8Array(exportBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': exportBuffer.length.toString(),
        'X-Export-TenantId': tenantId,
      },
    });
  } catch (error: unknown) {
    Logger.error('[TenantExport] Export failed:', error);
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}
