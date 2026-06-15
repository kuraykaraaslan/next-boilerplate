import 'reflect-metadata';
import type { MediaGallery, MediaGalleryItemView, MediaGalleryWithItems } from './media_gallery.types';
import type {
  AddGalleryItemDTO, UpdateGalleryItemDTO, ReorderGalleryItemsDTO, BulkAddGalleryItemsDTO, GallerySearchDTO,
} from './media_gallery.dto';
import { MediaGalleryItem as ItemEntity } from './entities/media_gallery_item.entity';
import {
  getOrCreate, listItems, addItem, findDuplicates, updateItem, removeItem, reorder,
} from './media_gallery.crud.service';
import {
  bulkAddItems, bulkRemoveItems, softDeleteItem, restoreItem, listDeleted,
} from './media_gallery.bulk.service';
import { search, usageForFile, isFileReferenced } from './media_gallery.query.service';

/**
 * Media-gallery service facade. The implementation is split across focused
 * modules (`media_gallery.crud.service`, `media_gallery.bulk.service`,
 * `media_gallery.query.service`, plus the `media_gallery.view` helper); this
 * class preserves the single `MediaGalleryService.*` entry point.
 */
export default class MediaGalleryService {
  static getOrCreate(tenantId: string, entityType: string, entityId: string): Promise<MediaGallery> {
    return getOrCreate(tenantId, entityType, entityId);
  }

  static listItems(tenantId: string, entityType: string, entityId: string): Promise<MediaGalleryWithItems> {
    return listItems(tenantId, entityType, entityId);
  }

  static addItem(tenantId: string, entityType: string, entityId: string, dto: AddGalleryItemDTO): Promise<MediaGalleryItemView> {
    return addItem(tenantId, entityType, entityId, dto);
  }

  static findDuplicates(
    tenantId: string,
    opts: { contentHash?: string | null; perceptualHash?: string | null; maxDistance?: number },
  ): Promise<ItemEntity[]> {
    return findDuplicates(tenantId, opts);
  }

  static updateItem(tenantId: string, itemId: string, dto: UpdateGalleryItemDTO): Promise<MediaGalleryItemView> {
    return updateItem(tenantId, itemId, dto);
  }

  static removeItem(tenantId: string, itemId: string): Promise<void> {
    return removeItem(tenantId, itemId);
  }

  static reorder(tenantId: string, galleryId: string, dto: ReorderGalleryItemsDTO): Promise<void> {
    return reorder(tenantId, galleryId, dto);
  }

  static bulkAddItems(tenantId: string, entityType: string, entityId: string, dto: BulkAddGalleryItemsDTO): Promise<MediaGalleryItemView[]> {
    return bulkAddItems(tenantId, entityType, entityId, dto);
  }

  static bulkRemoveItems(tenantId: string, itemIds: string[]): Promise<number> {
    return bulkRemoveItems(tenantId, itemIds);
  }

  static softDeleteItem(tenantId: string, itemId: string): Promise<void> {
    return softDeleteItem(tenantId, itemId);
  }

  static restoreItem(tenantId: string, itemId: string): Promise<void> {
    return restoreItem(tenantId, itemId);
  }

  static listDeleted(tenantId: string, galleryId: string): Promise<MediaGalleryItemView[]> {
    return listDeleted(tenantId, galleryId);
  }

  static search(tenantId: string, dto: GallerySearchDTO): Promise<{ data: MediaGalleryItemView[]; total: number }> {
    return search(tenantId, dto);
  }

  static usageForFile(tenantId: string, uploadedFileId: string): Promise<Array<{ galleryId: string; entityType: string; entityId: string; itemId: string }>> {
    return usageForFile(tenantId, uploadedFileId);
  }

  static isFileReferenced(tenantId: string, uploadedFileId: string): Promise<boolean> {
    return isFileReferenced(tenantId, uploadedFileId);
  }
}
