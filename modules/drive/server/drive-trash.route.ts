import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveCrudService from '@kuraykaraaslan/drive/server/drive.crud.service';
import { ListDriveDTO } from '@kuraykaraaslan/drive/server/drive.dto';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

/**
 * GET /tenant/[tenantId]/api/drive/trash
 * List soft-deleted nodes (the trash bin), most-recently-deleted first.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });

    const { searchParams } = new URL(request.url);
    const parsed = ListDriveDTO.pick({ page: true, pageSize: true }).safeParse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const { nodes, total } = await DriveCrudService.listTrash(tenantId, parsed.data.page, parsed.data.pageSize);
    return NextResponse.json({ nodes, total }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
