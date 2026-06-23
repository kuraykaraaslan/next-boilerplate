import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveUploadService from '@kuraykaraaslan/drive/server/drive.upload.service';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { clientOrigin, errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

/**
 * POST /tenant/[tenantId]/api/drive/upload
 * Upload a file into Drive. Body (FormData): file (required), parentId (optional).
 * Uploading into a folder requires at least editor access to that folder.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'USER',
      tenantId,
    });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const parentIdRaw = formData.get('parentId');
    const parentId = parentIdRaw ? String(parentIdRaw) : null;
    if (!file) return NextResponse.json({ message: 'File is required.' }, { status: 400 });

    // Must have edit rights on the destination folder (root is always allowed).
    if (parentId) {
      await authorizeNode(tenantId, parentId, user.userId, tenantMember.memberRole, { minRole: 'editor' });
    }

    const node = await DriveUploadService.upload(tenantId, user.userId, file, parentId, clientOrigin(request));
    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
