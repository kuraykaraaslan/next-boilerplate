import { z } from 'zod';
import { GalleryEntityTypeEnum } from './media_gallery.enums';

export const MediaGallerySchema = z.object({
  galleryId:  z.string().uuid(),
  tenantId:   z.string().uuid(),
  entityType: GalleryEntityTypeEnum,
  entityId:   z.string().uuid(),
  createdAt:  z.date(),
});
export type MediaGallery = z.infer<typeof MediaGallerySchema>;

/**
 * Persisted shape — only the gallery-side overlay + FK to UploadedFile.
 */
export const MediaGalleryItemSchema = z.object({
  itemId:         z.string().uuid(),
  galleryId:      z.string().uuid(),
  tenantId:       z.string().uuid(),
  uploadedFileId: z.string().uuid(),
  altText:        z.string().nullable().optional(),
  title:          z.string().nullable().optional(),
  tags:           z.array(z.string()).nullable().optional(),
  contentHash:    z.string().nullable().optional(),
  perceptualHash: z.string().nullable().optional(),
  sortOrder:      z.number().int(),
  isPrimary:      z.boolean(),
  createdAt:      z.date(),
});
export type MediaGalleryItem = z.infer<typeof MediaGalleryItemSchema>;

/**
 * Read shape — gallery item with the UploadedFile's url/mimeType resolved
 * via JOIN. This is what every list/read endpoint returns so clients can
 * render the photo without a second hop to /api/storage.
 */
export const MediaGalleryItemViewSchema = MediaGalleryItemSchema.extend({
  url:      z.string(),
  mimeType: z.string().nullable().optional(),
  isVideo:  z.boolean().optional(),
  srcset:   z.string().nullable().optional(),
});
export type MediaGalleryItemView = z.infer<typeof MediaGalleryItemViewSchema>;

export const MediaGalleryWithItemsSchema = MediaGallerySchema.extend({
  items: z.array(MediaGalleryItemViewSchema),
});
export type MediaGalleryWithItems = z.infer<typeof MediaGalleryWithItemsSchema>;
