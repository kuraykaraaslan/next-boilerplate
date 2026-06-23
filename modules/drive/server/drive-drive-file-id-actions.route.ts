import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { listActions } from '@kuraykaraaslan/drive/server/drive.plugins';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string }> };

/**
 * GET /api/drive/[driveFileId]/actions
 * List `drive:action` plugins applicable to this file. Requires viewer access.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    const { node } = await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'viewer' });
    const actions = await listActions(tenantId, node.mimeType);
    return NextResponse.json({ actions }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
