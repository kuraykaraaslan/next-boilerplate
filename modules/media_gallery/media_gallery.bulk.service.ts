import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { MediaGalleryItem as ItemEntity } from './entities/media_gallery_item.entity';
import { UploadedFile } from '@/modules/storage/entities/uploaded_file.entity';
import { type MediaGalleryItemView } from './media_gallery.types';
import type { BulkAddGalleryItemsDTO } from './media_gallery.dto';
import { MEDIA_GALLERY_MESSAGES } from './media_gallery.messages';
import { toView } from './media_gallery.view';
import { getOrCreate, assertWithinItemCap } from './media_gallery.crud.service';

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
  return saved.map((i) => toView(i, fileMap.get(i.uploadedFileId)));
}

/** Bulk soft-delete items. */
export async function bulkRemoveItems(tenantId: string, itemIds: string[]): Promise<number> {
  if (itemIds.length === 0) return 0;
  const ds = await tenantDataSourceFor(tenantId);
  const res = await ds.getRepository(ItemEntity).softDelete({ tenantId, itemId: In(itemIds) });
  return res.affected ?? 0;
}

export async function softDeleteItem(tenantId: string, itemId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ItemEntity);
  const item = await repo.findOne({ where: { tenantId, itemId } });
  if (!item) throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await repo.softDelete({ tenantId, itemId });
}

export async function restoreItem(tenantId: string, itemId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  await ds.getRepository(ItemEntity).restore({ tenantId, itemId });
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
