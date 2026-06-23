import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveShareService from '@kuraykaraaslan/drive/server/drive.share.service';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { ShareUserDTO } from '@kuraykaraaslan/drive/server/drive.dto';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string }> };

/** GET /api/drive/[driveFileId]/shares — list internal shares. Owner only. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner' });
    const shares = await DriveShareService.listShares(tenantId, driveFileId);
    return NextResponse.json({ shares }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/drive/[driveFileId]/shares — share with a user. Owner only. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner' });

    const body = await request.json();
    const parsed = ShareUserDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    const share = await DriveShareService.addShare(tenantId, driveFileId, user.userId, parsed.data.sharedWithUserId, parsed.data.role);
    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/drive/[driveFileId]/shares?sharedWithUserId= — revoke. Owner only. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner' });

    const sharedWithUserId = new URL(request.url).searchParams.get('sharedWithUserId');
    if (!sharedWithUserId) return NextResponse.json({ message: 'sharedWithUserId is required.' }, { status: 400 });
    await DriveShareService.removeShare(tenantId, driveFileId, sharedWithUserId);
    return NextResponse.json({ message: 'Share revoked.' }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
