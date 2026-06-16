import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { MediaGalleryItem as ItemEntity } from './entities/media_gallery_item.entity';
import { UploadedFile } from '@nb/storage/server/entities/uploaded_file.entity';
import { type MediaGalleryItemView } from './media_gallery.types';
import type { BulkAddGalleryItemsDTO } from './media_gallery.dto';
import { MEDIA_GALLERY_MESSAGES } from './media_gallery.messages';
import { toView } from './media_gallery.view';
import { getOrCreate, assertWithinItemCap } from './media_gallery.crud.service';
import { invalidateFileUsage } from './media_gallery.query.service';

/** Add many items to a gallery in one operation (cap-enforced). */
export async function bulkAddItems(
  tenantId: string, entityType: string, entityId: string, dto: BulkAddGalleryItemsDTO,
): Promise<MediaGalleryItemView[]> {
  const gallery = await getOrCreate(tenantId, entityType, entityId);
  await assertWithinItemCap(tenantId, gallery.galleryId, dto.items.length);
  const ds = await tenantDataSourceFor(tenantId);
  const fileIds = dto.items.map((i) => i.uploadedFileId);
  const files = await ds.getRepository(UploadedFile).find({ where: { tenantId, uploadedFileId: In(fileIds) } });
  const fileMap = new Map(files.map((f) => [f.uploadedFileId, f]));

  const saved = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(ItemEntity);
    const rows = dto.items
      .filter((i) => fileMap.has(i.uploadedFileId))
      .map((i) => repo.create({ tenantId, galleryId: gallery.galleryId, ...i }));
    return repo.save(rows);
  });
  await Promise.all([...new Set(saved.map((i) => i.uploadedFileId))].map((fid) => invalidateFileUsage(tenantId, fid)));
  return saved.map((i) => toView(i, fileMap.get(i.uploadedFileId)));
}

/** Bulk soft-delete items. */
export async function bulkRemoveItems(tenantId: string, itemIds: string[]): Promise<number> {
  if (itemIds.length === 0) return 0;
  const ds = await tenantDataSourceFor(tenantId);
  // Capture the files these items reference before removing, to evict their usage cache.
  const items = await ds.getRepository(ItemEntity).find({ where: { tenantId, itemId: In(itemIds) } });
  const res = await ds.getRepository(ItemEntity).softDelete({ tenantId, itemId: In(itemIds) });
  await Promise.all([...new Set(items.map((i) => i.uploadedFileId))].map((fid) => invalidateFileUsage(tenantId, fid)));
  return res.affected ?? 0;
}

export async function softDeleteItem(tenantId: string, itemId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ItemEntity);
  const item = await repo.findOne({ where: { tenantId, itemId } });
  if (!item) throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await repo.softDelete({ tenantId, itemId });
  await invalidateFileUsage(tenantId, item.uploadedFileId);
}

export async function restoreItem(tenantId: string, itemId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  // Read incl. soft-deleted so we know which file's usage cache to evict on restore.
  const item = await ds.getRepository(ItemEntity).findOne({ where: { tenantId, itemId }, withDeleted: true });
  await ds.getRepository(ItemEntity).restore({ tenantId, itemId });
  if (item) await invalidateFileUsage(tenantId, item.uploadedFileId);
}

export async function listDeleted(tenantId: string, galleryId: string): Promise<MediaGalleryItemView[]> {
  const ds = await tenantDataSourceFor(tenantId);
  const items = await ds.getRepository(ItemEntity).find({
    where: { tenantId, galleryId }, withDeleted: true,
  });
  const deleted = items.filter((i) => i.deletedAt != null);
  const files = await ds.getRepository(UploadedFile).find({ where: { tenantId, uploadedFileId: In(deleted.map((i) => i.uploadedFileId)) } });
  const fileMap = new Map(files.map((f) => [f.uploadedFileId, f]));
  return deleted.map((i) => toView(i, fileMap.get(i.uploadedFileId)));
}
