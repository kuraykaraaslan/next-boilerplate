import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { MediaGallery as GalleryEntity } from './entities/media_gallery.entity';
import { MediaGalleryItem as ItemEntity } from './entities/media_gallery_item.entity';
import { UploadedFile } from '@kuraykaraaslan/storage/server/entities/uploaded_file.entity';
import {
  MediaGallerySchema,
  MediaGalleryWithItemsSchema,
  type MediaGallery,
  type MediaGalleryItemView,
  type MediaGalleryWithItems,
} from './media_gallery.types';
import type { AddGalleryItemDTO, UpdateGalleryItemDTO, ReorderGalleryItemsDTO } from './media_gallery.dto';
import { MEDIA_GALLERY_MESSAGES } from './media_gallery.messages';
import MediaGalleryUrlService from './media_gallery.url';
import MediaGalleryIntelligenceService from './media_gallery.intelligence.service';
import { invalidateFileUsage } from './media_gallery.query.service';
import { toView } from './media_gallery.view';

export async function getOrCreate(tenantId: string, entityType: string, entityId: string): Promise<MediaGallery> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(GalleryEntity);
  let gallery = await repo.findOne({ where: { tenantId, entityType, entityId } });
  if (!gallery) {
    gallery = await repo.save(repo.create({ tenantId, entityType, entityId }));
  }
  return MediaGallerySchema.parse(gallery);
}

/** Enforce the per-tenant gallery item cap (`mediaGalleryMaxItems` setting). */
export async function assertWithinItemCap(tenantId: string, galleryId: string, adding: number): Promise<void> {
  let cap = 0;
  try {
    const { default: SettingService } = await import('@kuraykaraaslan/setting/server/setting.service');
    cap = Number(await SettingService.getValue(tenantId, 'mediaGalleryMaxItems').catch(() => null)) || 0;
  } catch { cap = 0; }
  if (cap <= 0) return;
  const ds = await tenantDataSourceFor(tenantId);
  const count = await ds.getRepository(ItemEntity).count({ where: { tenantId, galleryId } });
  if (count + adding > cap) {
    throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_LIMIT_REACHED, 409, ErrorCode.CONFLICT);
  }
}

export async function addItem(
  tenantId: string,
  entityType: string,
  entityId: string,
  dto: AddGalleryItemDTO,
): Promise<MediaGalleryItemView> {
  const ds = await tenantDataSourceFor(tenantId);
  const file = await ds.getRepository(UploadedFile).findOne({
    where: { tenantId, uploadedFileId: dto.uploadedFileId },
  });
  if (!file) throw new AppError(MEDIA_GALLERY_MESSAGES.UPLOADED_FILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const gallery = await getOrCreate(tenantId, entityType, entityId);
  await assertWithinItemCap(tenantId, gallery.galleryId, 1);

  // Safety + intelligence (all best-effort / gated on per-tenant config):
  //  - CSAM scan blocks the add when a match is reported
  //  - content + perceptual hashes enable dedup
  //  - auto alt-text fills missing accessibility text
  const isImage = MediaGalleryUrlService.isImage(file.mimeType);
  let altText = dto.altText;
  let contentHash: string | null = null;
  let perceptualHash: string | null = null;
  if (isImage && file.url) {
    const csam = await MediaGalleryIntelligenceService.csamScan(tenantId, file.url);
    if (csam?.match) throw new AppError(MEDIA_GALLERY_MESSAGES.CSAM_DETECTED, 422, ErrorCode.VALIDATION_ERROR);
    contentHash = await MediaGalleryIntelligenceService.contentHashFromUrl(file.url);
    perceptualHash = await MediaGalleryIntelligenceService.perceptualHash(tenantId, file.url);
    if (!altText) altText = (await MediaGalleryIntelligenceService.generateAltText(tenantId, file.url)) ?? undefined;
  }

  const item = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(ItemEntity);
    if (dto.isPrimary) {
      await repo.update({ tenantId, galleryId: gallery.galleryId }, { isPrimary: false });
    }
    return repo.save(repo.create({ tenantId, galleryId: gallery.galleryId, ...dto, altText, contentHash, perceptualHash }));
  });

  await invalidateFileUsage(tenantId, item.uploadedFileId);
  return toView(item, file);
}

/**
 * Find duplicate / near-duplicate items by exact content hash (always) or
 * perceptual-hash similarity within a Hamming-distance threshold.
 */
export async function findDuplicates(
  tenantId: string, opts: { contentHash?: string | null; perceptualHash?: string | null; maxDistance?: number },
): Promise<ItemEntity[]> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ItemEntity);
  if (opts.contentHash) {
    const exact = await repo.find({ where: { tenantId, contentHash: opts.contentHash } });
    if (exact.length > 0) return exact;
  }
  if (opts.perceptualHash) {
    const max = opts.maxDistance ?? 5;
    const candidates = await repo.createQueryBuilder('i')
      .where('i."tenantId" = :tenantId AND i."perceptualHash" IS NOT NULL', { tenantId }).getMany();
    return candidates.filter((c) => MediaGalleryIntelligenceService.hammingDistance(c.perceptualHash ?? '', opts.perceptualHash as string) <= max);
  }
  return [];
}

export async function updateItem(
  tenantId: string,
  itemId: string,
  dto: UpdateGalleryItemDTO,
): Promise<MediaGalleryItemView> {
  const ds = await tenantDataSourceFor(tenantId);
  const existing = await ds.getRepository(ItemEntity).findOne({ where: { tenantId, itemId } });
  if (!existing) throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const saved = await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(ItemEntity);
    if (dto.isPrimary) {
      await repo.update({ tenantId, galleryId: existing.galleryId }, { isPrimary: false });
    }
    Object.assign(existing, dto);
    return repo.save(existing);
  });

  const file = await ds.getRepository(UploadedFile).findOne({
    where: { tenantId, uploadedFileId: saved.uploadedFileId },
  });
  return toView(saved, file ?? undefined);
}

export async function removeItem(tenantId: string, itemId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ItemEntity);
  const item = await repo.findOne({ where: { tenantId, itemId } });
  if (!item) throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await repo.delete({ tenantId, itemId });
  await invalidateFileUsage(tenantId, item.uploadedFileId);
}

export async function reorder(
  tenantId: string,
  galleryId: string,
  dto: ReorderGalleryItemsDTO,
): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  await ds.transaction(async (mgr) => {
    const repo = mgr.getRepository(ItemEntity);
    await Promise.all(
      dto.orderedIds.map((id, index) =>
        repo.update({ tenantId, itemId: id, galleryId }, { sortOrder: index }),
      ),
    );
  });
}

export async function listItems(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<MediaGalleryWithItems> {
  const gallery = await getOrCreate(tenantId, entityType, entityId);
  const ds = await tenantDataSourceFor(tenantId);
  const items = await ds.getRepository(ItemEntity).find({
    where: { tenantId, galleryId: gallery.galleryId },
    order: { isPrimary: 'DESC', sortOrder: 'ASC' },
  });
  const fileIds = items.map((i) => i.uploadedFileId);
  const files = fileIds.length
    ? await ds.getRepository(UploadedFile).find({ where: { tenantId, uploadedFileId: In(fileIds) } })
    : [];
  const fileMap = new Map(files.map((f) => [f.uploadedFileId, f]));
  return MediaGalleryWithItemsSchema.parse({
    ...gallery,
    items: items.map((i) => toView(i, fileMap.get(i.uploadedFileId))),
  });
}
