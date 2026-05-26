import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { singleFlight } from '@/modules/redis';
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
import type { AddGalleryItemDTO, UpdateGalleryItemDTO, ReorderGalleryItemsDTO } from './media_gallery.dto';
import { MEDIA_GALLERY_MESSAGES } from './media_gallery.messages';

function cacheKey(tenantId: string, entityType: string, entityId: string) {
  return `gallery:${tenantId}:${entityType}:${entityId}`;
}

function toView(item: ItemEntity, file: UploadedFile | undefined): MediaGalleryItemView {
  return MediaGalleryItemViewSchema.parse({
    itemId:         item.itemId,
    galleryId:      item.galleryId,
    tenantId:       item.tenantId,
    uploadedFileId: item.uploadedFileId,
    altText:        item.altText ?? null,
    title:          item.title ?? null,
    sortOrder:      item.sortOrder,
    isPrimary:      item.isPrimary,
    createdAt:      item.createdAt,
    url:            file?.url ?? '',
    mimeType:       file?.mimeType ?? null,
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
    return singleFlight(cacheKey(tenantId, entityType, entityId), async () => {
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
    if (!file) throw new Error(MEDIA_GALLERY_MESSAGES.UPLOADED_FILE_NOT_FOUND);

    const gallery = await MediaGalleryService.getOrCreate(tenantId, entityType, entityId);
    const repo = ds.getRepository(ItemEntity);
    if (dto.isPrimary) {
      await repo.update({ tenantId, galleryId: gallery.galleryId }, { isPrimary: false });
    }
    const item = await repo.save(repo.create({ tenantId, galleryId: gallery.galleryId, ...dto }));
    await redis.del(cacheKey(tenantId, entityType, entityId));
    return toView(item, file);
  }

  static async updateItem(
    tenantId: string,
    itemId: string,
    dto: UpdateGalleryItemDTO,
  ): Promise<MediaGalleryItemView> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ItemEntity);
    const item = await repo.findOne({ where: { tenantId, itemId } });
    if (!item) throw new Error(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND);
    if (dto.isPrimary) {
      await repo.update({ tenantId, galleryId: item.galleryId }, { isPrimary: false });
    }
    Object.assign(item, dto);
    const saved = await repo.save(item);
    const file = await ds.getRepository(UploadedFile).findOne({
      where: { tenantId, uploadedFileId: saved.uploadedFileId },
    });
    await MediaGalleryService._invalidate(tenantId, item.galleryId);
    return toView(saved, file ?? undefined);
  }

  static async removeItem(tenantId: string, itemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ItemEntity);
    const item = await repo.findOne({ where: { tenantId, itemId } });
    if (!item) throw new Error(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND);
    await repo.delete({ tenantId, itemId });
    await MediaGalleryService._invalidate(tenantId, item.galleryId);
  }

  static async reorder(
    tenantId: string,
    galleryId: string,
    dto: ReorderGalleryItemsDTO,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ItemEntity);
    await Promise.all(
      dto.orderedIds.map((id, index) =>
        repo.update({ tenantId, itemId: id, galleryId }, { sortOrder: index }),
      ),
    );
    await MediaGalleryService._invalidate(tenantId, galleryId);
  }

  private static async _invalidate(tenantId: string, galleryId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const gallery = await ds.getRepository(GalleryEntity)
      .findOne({ where: { tenantId, galleryId } });
    if (gallery) {
      await redis.del(cacheKey(tenantId, gallery.entityType, gallery.entityId));
    }
  }
}
