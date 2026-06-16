import { MediaGalleryItem as ItemEntity } from './entities/media_gallery_item.entity';
import { UploadedFile } from '@nb/storage/server/entities/uploaded_file.entity';
import { MediaGalleryItemViewSchema, type MediaGalleryItemView } from './media_gallery.types';
import MediaGalleryUrlService from './media_gallery.url';

export function toView(item: ItemEntity, file: UploadedFile | undefined): MediaGalleryItemView {
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
