import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import MediaGalleryService from '@kuraykaraaslan/media_gallery/server/media_gallery.service';
import { AddGalleryItemDTO } from '@kuraykaraaslan/media_gallery/server/media_gallery.dto';

type Ctx = { params: Promise<{ tenantId: string; entityType: string; entityId: string }> };

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({
    request, tenantId, requiredTenantRole: 'ADMIN',
  });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, entityType, entityId } = await params;
  try { await auth(request, tenantId); } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 403 }); }
  try {
    const gallery = await MediaGalleryService.listItems(tenantId, entityType, entityId);
    return NextResponse.json({ gallery });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 400 }); }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, entityType, entityId } = await params;
  try { await auth(request, tenantId); } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 403 }); }
  try {
    const dto = AddGalleryItemDTO.parse(await request.json());
    const item = await MediaGalleryService.addItem(tenantId, entityType, entityId, dto);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 400 }); }
}
