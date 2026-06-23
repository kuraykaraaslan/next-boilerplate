import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import DriveCrudService from '@kuraykaraaslan/drive/server/drive.crud.service';
import { ListDriveDTO, CreateFolderDTO } from '@kuraykaraaslan/drive/server/drive.dto';
import { errorResponse } from '@kuraykaraaslan/drive/server/drive.route-helpers';

/**
 * GET /tenant/[tenantId]/api/drive?parentId=&page=&pageSize=
 * List the children of a folder (root when parentId is omitted) + breadcrumb.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });

    const { searchParams } = new URL(request.url);
    const parsed = ListDriveDTO.safeParse({
      parentId: searchParams.get('parentId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const parentId = parsed.data.parentId ?? null;
    const [{ nodes, total }, breadcrumb] = await Promise.all([
      DriveCrudService.listChildren(tenantId, parentId, parsed.data.page, parsed.data.pageSize),
      DriveCrudService.breadcrumb(tenantId, parentId),
    ]);
    return NextResponse.json({ nodes, total, breadcrumb }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /tenant/[tenantId]/api/drive
 * Create a folder. Body: { name, parentId? }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, requiredTenantRole: 'USER', tenantId });

    const body = await request.json();
    const parsed = CreateFolderDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const node = await DriveCrudService.createFolder(tenantId, user.userId, parsed.data.name, parsed.data.parentId ?? null);
    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
