import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveCrudService from '@kuraykaraaslan/drive/server/drive.crud.service';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { UpdateNodeDTO } from '@kuraykaraaslan/drive/server/drive.dto';
import { DriveNodeSchema } from '@kuraykaraaslan/drive/server/drive.types';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string }> };

/** GET /api/drive/[driveFileId] — node metadata + the caller's effective role. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    const { node, role } = await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'viewer' });
    return NextResponse.json({ node: DriveNodeSchema.parse(node), role }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** PATCH /api/drive/[driveFileId] — rename and/or move. Requires editor access. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });

    const body = await request.json();
    const parsed = UpdateNodeDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'editor' });

    // Moving into a folder also needs edit rights on the destination.
    if (parsed.data.parentId !== undefined && parsed.data.parentId !== null) {
      await authorizeNode(tenantId, parsed.data.parentId, user.userId, tenantMember.memberRole, { minRole: 'editor' });
    }

    let node;
    if (parsed.data.name !== undefined) node = await DriveCrudService.rename(tenantId, driveFileId, parsed.data.name);
    if (parsed.data.parentId !== undefined) node = await DriveCrudService.move(tenantId, driveFileId, parsed.data.parentId);
    return NextResponse.json({ node }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/drive/[driveFileId] — move to trash. Requires owner access. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner' });
    await DriveCrudService.softDelete(tenantId, driveFileId);
    return NextResponse.json({ message: 'Moved to trash.' }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
