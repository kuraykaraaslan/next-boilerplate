import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import MediaGalleryService from '@/modules/media_gallery/media_gallery.service';
import { UpdateGalleryItemDTO } from '@/modules/media_gallery/media_gallery.dto';

type Ctx = { params: Promise<{ tenantId: string; itemId: string }> };

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, itemId } = await params;
  try { await auth(request, tenantId); } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 403 }); }
  try {
    const dto = UpdateGalleryItemDTO.parse(await request.json());
    const item = await MediaGalleryService.updateItem(tenantId, itemId, dto);
    return NextResponse.json({ item });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 400 }); }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId, itemId } = await params;
  try { await auth(request, tenantId); } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 403 }); }
  try {
    await MediaGalleryService.removeItem(tenantId, itemId);
    return NextResponse.json({ success: true });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 400 }); }
}
