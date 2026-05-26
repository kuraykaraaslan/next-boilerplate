import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import MediaGalleryService from '@/modules/media_gallery/media_gallery.service';
import { ReorderGalleryItemsDTO } from '@/modules/media_gallery/media_gallery.dto';

type Ctx = { params: Promise<{ tenantId: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request);
  if (rl) return rl;
  const { tenantId } = await params;
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 403 }); }
  try {
    const body = z.object({ galleryId: z.string().uuid() })
      .merge(ReorderGalleryItemsDTO)
      .parse(await request.json());
    await MediaGalleryService.reorder(tenantId, body.galleryId, { orderedIds: body.orderedIds });
    return NextResponse.json({ success: true });
  } catch (err: any) { return NextResponse.json({ message: err.message }, { status: 400 }); }
}
