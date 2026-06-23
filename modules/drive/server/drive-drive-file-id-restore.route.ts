import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveCrudService from '@kuraykaraaslan/drive/server/drive.crud.service';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string }> };

/** POST /api/drive/[driveFileId]/restore — restore a trashed node. Owner only. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner', withDeleted: true });
    const node = await DriveCrudService.restore(tenantId, driveFileId);
    return NextResponse.json({ node }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
