import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveCrudService from '@kuraykaraaslan/drive/server/drive.crud.service';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string }> };

/**
 * DELETE /api/drive/[driveFileId]/permanent — permanently delete a node and its
 * subtree, purging the underlying storage bytes. Owner only.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner', withDeleted: true });
    await DriveCrudService.hardDelete(tenantId, driveFileId);
    return NextResponse.json({ message: 'Permanently deleted.' }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
