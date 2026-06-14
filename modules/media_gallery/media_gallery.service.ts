import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { MediaGallery as GalleryEntity } from './entities/media_gallery.entity';
import { MediaGalleryItem as ItemEntity } from './entities/media_gallery_item.entity';
import { UploadedFile } from '@/modules/storage/entities/uploaded_file.entity';
import {
  MediaGallerySchema,
  MediaGalleryItemViewSchema,
  MediaGalleryWithItemsSchema,
  type MediaGallery,
  type MediaGalleryItemView,
  type MediaGalleryWithItems,
} from './media_gallery.types';
import type { AddGalleryItemDTO, UpdateGalleryItemDTO, ReorderGalleryItemsDTO, BulkAddGalleryItemsDTO, GallerySearchDTO } from './media_gallery.dto';
import { MEDIA_GALLERY_MESSAGES } from './media_gallery.messages';
import MediaGalleryUrlService from './media_gallery.url';
import MediaGalleryIntelligenceService from './media_gallery.intelligence.service';

function toView(item: ItemEntity, file: UploadedFile | undefined): MediaGalleryItemView {
  const url = file?.url ?? '';
  const mimeType = file?.mimeType ?? null;
  const isVideo = MediaGalleryUrlService.isVideo(mimeType);
  return MediaGalleryItemViewSchema.parse({
    itemId:         item.itemId,
    galleryId:      item.galleryId,
    tenantId:       item.tenantId,
    uploadedFileId: item.uploadedFileId,
    altText:        item.altText ?? null,
    title:          item.title ?? null,
    tags:           item.tags ?? null,
    sortOrder:      item.sortOrder,
    isPrimary:      item.isPrimary,
    createdAt:      item.createdAt,
    url,
    mimeType,
    isVideo,
    // Responsive srcset only for images (videos have no width variants).
    srcset:         isVideo || !url ? null : MediaGalleryUrlService.srcset(url),
  });
}

export default class MediaGalleryService {
  static async getOrCreate(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<MediaGallery> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(GalleryEntity);
    let gallery = await repo.findOne({ where: { tenantId, entityType, entityId } });
    if (!gallery) {
      gallery = await repo.save(repo.create({ tenantId, entityType, entityId }));
    }
    return MediaGallerySchema.parse(gallery);
  }

  static async listItems(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<MediaGalleryWithItems> {
    const gallery = await MediaGalleryService.getOrCreate(tenantId, entityType, entityId);
    const ds = await tenantDataSourceFor(tenantId);
    const items = await ds.getRepository(ItemEntity).find({
      where: { tenantId, galleryId: gallery.galleryId },
      order: { isPrimary: 'DESC', sortOrder: 'ASC' },
    });
    const fileIds = items.map((i) => i.uploadedFileId);
    const files = fileIds.length
      ? await ds.getRepository(UploadedFile).find({
          where: { tenantId, uploadedFileId: In(fileIds) },
        })
      : [];
    const fileMap = new Map(files.map((f) => [f.uploadedFileId, f]));
    return MediaGalleryWithItemsSchema.parse({
      ...gallery,
      items: items.map((i) => toView(i, fileMap.get(i.uploadedFileId))),
    });
  }

  static async addItem(
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

    const gallery = await MediaGalleryService.getOrCreate(tenantId, entityType, entityId);
    await MediaGalleryService.assertWithinItemCap(tenantId, gallery.galleryId, 1);

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

    return toView(item, file);
  }

  /**
   * Find duplicate / near-duplicate items by exact content hash (always) or
   * perceptual-hash similarity within a Hamming-distance threshold.
   */
  static async findDuplicates(
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

  /** Enforce the per-tenant gallery item cap (`mediaGalleryMaxItems` setting). */
  private static async assertWithinItemCap(tenantId: string, galleryId: string, adding: number): Promise<void> {
    let cap = 0;
    try {
      const { default: SettingService } = await import('@/modules/setting/setting.service');
      cap = Number(await SettingService.getValue(tenantId, 'mediaGalleryMaxItems').catch(() => null)) || 0;
    } catch { cap = 0; }
    if (cap <= 0) return;
    const ds = await tenantDataSourceFor(tenantId);
    const count = await ds.getRepository(ItemEntity).count({ where: { tenantId, galleryId } });
    if (count + adding > cap) {
      throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_LIMIT_REACHED, 409, ErrorCode.CONFLICT);
    }
  }

  static async updateItem(
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

  static async removeItem(tenantId: string, itemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ItemEntity);
    const item = await repo.findOne({ where: { tenantId, itemId } });
    if (!item) throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.delete({ tenantId, itemId });
  }

  static async reorder(
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

  // ── Bulk operations ─────────────────────────────────────────────────────────

  /** Add many items to a gallery in one operation (cap-enforced). */
  static async bulkAddItems(
    tenantId: string, entityType: string, entityId: string, dto: BulkAddGalleryItemsDTO,
  ): Promise<MediaGalleryItemView[]> {
    const gallery = await MediaGalleryService.getOrCreate(tenantId, entityType, entityId);
    await MediaGalleryService.assertWithinItemCap(tenantId, gallery.galleryId, dto.items.length);
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
  static async bulkRemoveItems(tenantId: string, itemIds: string[]): Promise<number> {
    if (itemIds.length === 0) return 0;
    const ds = await tenantDataSourceFor(tenantId);
    const res = await ds.getRepository(ItemEntity).softDelete({ tenantId, itemId: In(itemIds) });
    return res.affected ?? 0;
  }

  // ── Soft delete / restore ───────────────────────────────────────────────────

  static async softDeleteItem(tenantId: string, itemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ItemEntity);
    const item = await repo.findOne({ where: { tenantId, itemId } });
    if (!item) throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.softDelete({ tenantId, itemId });
  }

  static async restoreItem(tenantId: string, itemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(ItemEntity).restore({ tenantId, itemId });
  }

  static async listDeleted(tenantId: string, galleryId: string): Promise<MediaGalleryItemView[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const items = await ds.getRepository(ItemEntity).find({
      where: { tenantId, galleryId }, withDeleted: true,
    });
    const deleted = items.filter((i) => i.deletedAt != null);
    const files = await ds.getRepository(UploadedFile).find({ where: { tenantId, uploadedFileId: In(deleted.map((i) => i.uploadedFileId)) } });
    const fileMap = new Map(files.map((f) => [f.uploadedFileId, f]));
    return deleted.map((i) => toView(i, fileMap.get(i.uploadedFileId)));
  }

  // ── Search (full-text + tags + mime) ────────────────────────────────────────

  static async search(tenantId: string, dto: GallerySearchDTO): Promise<{ data: MediaGalleryItemView[]; total: number }> {
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

  // ── Usage tracking ──────────────────────────────────────────────────────────

  /** Which galleries (entityType/entityId) reference a given uploaded file. */
  static async usageForFile(tenantId: string, uploadedFileId: string): Promise<Array<{ galleryId: string; entityType: string; entityId: string; itemId: string }>> {
    const ds = await tenantDataSourceFor(tenantId);
    const items = await ds.getRepository(ItemEntity).find({ where: { tenantId, uploadedFileId } });
    if (items.length === 0) return [];
    const galleryIds = [...new Set(items.map((i) => i.galleryId))];
    const galleries = await ds.getRepository(GalleryEntity).find({ where: { tenantId, galleryId: In(galleryIds) } });
    const gMap = new Map(galleries.map((g) => [g.galleryId, g]));
    return items.map((i) => {
      const g = gMap.get(i.galleryId);
      return { galleryId: i.galleryId, entityType: g?.entityType ?? '', entityId: g?.entityId ?? '', itemId: i.itemId };
    });
  }

  /** Whether an uploaded file is still referenced by any gallery (safe-delete). */
  static async isFileReferenced(tenantId: string, uploadedFileId: string): Promise<boolean> {
    const ds = await tenantDataSourceFor(tenantId);
    return (await ds.getRepository(ItemEntity).count({ where: { tenantId, uploadedFileId } })) > 0;
  }
}
