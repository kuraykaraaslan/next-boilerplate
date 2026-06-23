import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveSystemService from '@kuraykaraaslan/drive/server/drive.system.service';
import { ListSystemDTO } from '@kuraykaraaslan/drive/server/drive.dto';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

/**
 * GET /tenant/[tenantId]/api/drive/system
 * Read-only "Common / System Files" view of every storage object the tenant
 * owns (including files uploaded by other modules). Admin/owner only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'ADMIN', tenantId });

    const { searchParams } = new URL(request.url);
    const parsed = ListSystemDTO.safeParse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const { files, total } = await DriveSystemService.listSystemFiles(tenantId, parsed.data.page, parsed.data.pageSize);
    return NextResponse.json({ files, total }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
