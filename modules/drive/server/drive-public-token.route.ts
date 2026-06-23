import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import DriveShareService from '@kuraykaraaslan/drive/server/drive.share.service';
import { previewKindFor, presignedUrlFor } from '@kuraykaraaslan/drive/server/drive.preview.service';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; token: string }> };

/**
 * GET /tenant/[tenantId]/api/drive/public/[token]
 * Unauthenticated access to a file via an "anyone with the link" token. Resolves
 * the token to its file, then returns a short-lived presigned URL + preview kind.
 * No tenant session is required — possession of the token is the authorization.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, token } = await params;

    const { node, role } = await DriveShareService.resolvePublicToken(tenantId, token);
    if (node.type !== 'file' || !node.storageKey) {
      return NextResponse.json({ message: 'This link points to a non-previewable item.' }, { status: 400 });
    }

    const url = await presignedUrlFor(tenantId, node.storageKey);
    return NextResponse.json(
      { name: node.name, mimeType: node.mimeType, kind: previewKindFor(node.mimeType), role, url },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
