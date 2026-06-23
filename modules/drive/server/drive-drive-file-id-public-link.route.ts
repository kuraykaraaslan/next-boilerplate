import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveShareService from '@kuraykaraaslan/drive/server/drive.share.service';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { CreatePublicLinkDTO } from '@kuraykaraaslan/drive/server/drive.dto';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string }> };

/** GET /api/drive/[driveFileId]/public-link — list active public links. Owner only. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner' });
    const links = await DriveShareService.listPublicLinks(tenantId, driveFileId);
    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/drive/[driveFileId]/public-link — create an "anyone with the link" link. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner' });

    const body = await request.json().catch(() => ({}));
    const parsed = CreatePublicLinkDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    const link = await DriveShareService.createPublicLink(tenantId, driveFileId, user.userId, parsed.data.role, expiresAt);
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/drive/[driveFileId]/public-link?linkId= — revoke a public link. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'owner' });

    const linkId = new URL(request.url).searchParams.get('linkId');
    if (!linkId) return NextResponse.json({ message: 'linkId is required.' }, { status: 400 });
    await DriveShareService.revokePublicLink(tenantId, linkId);
    return NextResponse.json({ message: 'Link revoked.' }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
