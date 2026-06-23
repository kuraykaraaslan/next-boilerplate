import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { listSources } from '@kuraykaraaslan/drive/server/drive.plugins';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

/**
 * GET /tenant/[tenantId]/api/drive/sources
 * List mounted `drive:source` external backends (Google Drive, Dropbox, …)
 * available to the tenant as virtual folders.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    const sources = await listSources(tenantId);
    return NextResponse.json({ sources }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
