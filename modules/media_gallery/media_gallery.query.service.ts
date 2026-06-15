import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { MediaGallery as GalleryEntity } from './entities/media_gallery.entity';
import { MediaGalleryItem as ItemEntity } from './entities/media_gallery_item.entity';
import { UploadedFile } from '@/modules/storage/entities/uploaded_file.entity';
import { type MediaGalleryItemView } from './media_gallery.types';
import type { GallerySearchDTO } from './media_gallery.dto';
import { toView } from './media_gallery.view';

// `usageForFile` / `isFileReferenced` back the safe-delete check that blocks every
// file deletion — a hot, write-blocking read whose answer only changes when a
// gallery item referencing the file is added or removed. Cache per (tenant, file)
// and invalidate explicitly from the item add/remove paths.
const FILE_REF_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 30);

function usageCacheKey(tenantId: string, uploadedFileId: string): string {
  return `media_gallery:usage:${tenantId}:${uploadedFileId}`;
}

/** Evict the cached usage/reference answer for a file (call on item add/remove). */
export async function invalidateFileUsage(tenantId: string, uploadedFileId: string): Promise<void> {
  await redis.del(usageCacheKey(tenantId, uploadedFileId)).catch(() => {});
}

export async function search(tenantId: string, dto: GallerySearchDTO): Promise<{ data: MediaGalleryItemView[]; total: number }> {
  const ds = await tenantDataSourceFor(tenantId);
  const qb = ds.getRepository(ItemEntity).createQueryBuilder('i')
    .innerJoin(UploadedFile, 'f', 'f."uploadedFileId" = i."uploadedFileId"')
    .where('i."tenantId" = :tenantId', { tenantId })
    .andWhere('i."deletedAt" IS NULL');
  if (dto.query) {
    qb.andWhere('(i."title" ILIKE :q OR i."altText" ILIKE :q)', { q: `%${dto.query}%` });
  }
  if (dto.tags && dto.tags.length > 0) {
    qb.andWhere('i."tags" ?| array[:...tags]', { tags: dto.tags });
  }
  if (dto.mimePrefix) {
    qb.andWhere('f."mimeType" ILIKE :mime', { mime: `${dto.mimePrefix}%` });
  }
  qb.orderBy('i."createdAt"', 'DESC').skip(dto.page * dto.pageSize).take(dto.pageSize);
  const [rows, total] = await qb.getManyAndCount();
  const files = await ds.getRepository(UploadedFile).find({ where: { tenantId, uploadedFileId: In(rows.map((r) => r.uploadedFileId)) } });
  const fileMap = new Map(files.map((f) => [f.uploadedFileId, f]));
  return { data: rows.map((r) => toView(r, fileMap.get(r.uploadedFileId))), total };
}

type FileUsage = { galleryId: string; entityType: string; entityId: string; itemId: string };

/** Which galleries (entityType/entityId) reference a given uploaded file. */
export async function usageForFile(tenantId: string, uploadedFileId: string): Promise<FileUsage[]> {
  const key = usageCacheKey(tenantId, uploadedFileId);
  const cached = await redis.get(key).catch(() => null);
  if (cached) {
    try { return JSON.parse(cached) as FileUsage[]; } catch { await redis.del(key).catch(() => {}); }
  }

  return singleFlight(key, async () => {
    const ds = await tenantDataSourceFor(tenantId);
    const items = await ds.getRepository(ItemEntity).find({ where: { tenantId, uploadedFileId } });
    let usage: FileUsage[] = [];
    if (items.length > 0) {
      const galleryIds = [...new Set(items.map((i) => i.galleryId))];
      const galleries = await ds.getRepository(GalleryEntity).find({ where: { tenantId, galleryId: In(galleryIds) } });
      const gMap = new Map(galleries.map((g) => [g.galleryId, g]));
      usage = items.map((i) => {
        const g = gMap.get(i.galleryId);
        return { galleryId: i.galleryId, entityType: g?.entityType ?? '', entityId: g?.entityId ?? '', itemId: i.itemId };
      });
    }
    await redis.setex(key, jitter(FILE_REF_CACHE_TTL), JSON.stringify(usage)).catch(() => {});
    return usage;
  });
}

/** Whether an uploaded file is still referenced by any gallery (safe-delete). */
export async function isFileReferenced(tenantId: string, uploadedFileId: string): Promise<boolean> {
  return (await usageForFile(tenantId, uploadedFileId)).length > 0;
}
