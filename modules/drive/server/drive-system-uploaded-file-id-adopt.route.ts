import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveSystemService from '@kuraykaraaslan/drive/server/drive.system.service';
import { AdoptSystemFileDTO } from '@kuraykaraaslan/drive/server/drive.dto';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

type Params = { params: Promise<{ tenantId: string; uploadedFileId: string }> };

/**
 * POST /tenant/[tenantId]/api/drive/system/[uploadedFileId]/adopt
 * Pull an existing storage object into Drive as a managed file (a reference,
 * not a copy). Admin/owner only. Body: { parentId? }.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, uploadedFileId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'ADMIN', tenantId });

    const body = await request.json().catch(() => ({}));
    const parsed = AdoptSystemFileDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }
    const node = await DriveSystemService.adopt(tenantId, user.userId, uploadedFileId, parsed.data.parentId ?? null);
    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
