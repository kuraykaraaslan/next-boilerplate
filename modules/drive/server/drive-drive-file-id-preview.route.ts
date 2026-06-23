import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { authorizeNode } from '@kuraykaraaslan/drive/server/drive.access.service';
import { previewKindFor, presignedUrlFor } from '@kuraykaraaslan/drive/server/drive.preview.service';
import { previewWithPlugin } from '@kuraykaraaslan/drive/server/drive.plugins';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; driveFileId: string }> };

/**
 * GET /api/drive/[driveFileId]/preview
 * Return a short-lived presigned URL plus a coarse preview kind. If a
 * `drive:preview` plugin claims the file's MIME type, its rendered output is
 * returned instead. Requires at least viewer access.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, driveFileId } = await params;
    const { user, tenantMember } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });
    const { node } = await authorizeNode(tenantId, driveFileId, user.userId, tenantMember.memberRole, { minRole: 'viewer' });

    if (node.type !== 'file' || !node.storageKey) {
      return NextResponse.json({ message: 'This item has no previewable content.' }, { status: 400 });
    }

    const url = await presignedUrlFor(tenantId, node.storageKey);
    const kind = previewKindFor(node.mimeType);
    const plugin = node.mimeType ? await previewWithPlugin(tenantId, node.mimeType, url) : null;

    return NextResponse.json(
      { url, kind, mimeType: node.mimeType, name: node.name, plugin: plugin ?? undefined },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
