import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { presignedUrlFor } from '@kuraykaraaslan/drive/server/drive.preview.service';
import { runAction } from '@kuraykaraaslan/drive/server/drive.plugins';
import DriveMessages from '@kuraykaraaslan/drive/server/drive.messages';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string; actionKey: string }> };

/**
 * POST /api/drive/[driveFileId]/actions/[actionKey]
 * Run a `drive:action` plugin against a file in the sandbox. The plugin receives
 * a short-lived presigned URL (never a storage secret). Requires editor access.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId, actionKey } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    const { node } = await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'editor' });

    if (node.type !== 'file' || !node.storageKey) {
      return NextResponse.json({ message: 'Actions apply to files only.' }, { status: 400 });
    }
    const presignedUrl = await presignedUrlFor(tenantId, node.storageKey);
    const result = await runAction(tenantId, actionKey, { driveFileId, presignedUrl, mimeType: node.mimeType });
    if (!result) return NextResponse.json({ message: DriveMessages.ACTION_NOT_FOUND }, { status: 404 });
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
