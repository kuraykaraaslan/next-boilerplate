import { z } from 'zod';

export const AddGalleryItemDTO = z.object({
  uploadedFileId: z.string().uuid(),
  altText:        z.string().max(300).optional(),
  title:          z.string().max(200).optional(),
  tags:           z.array(z.string().max(50)).max(30).optional(),
  sortOrder:      z.number().int().nonnegative().default(0),
  isPrimary:      z.boolean().default(false),
});
export type AddGalleryItemDTO = z.infer<typeof AddGalleryItemDTO>;

export const UpdateGalleryItemDTO = z.object({
  altText:   z.string().max(300).optional(),
  title:     z.string().max(200).optional(),
  tags:      z.array(z.string().max(50)).max(30).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isPrimary: z.boolean().optional(),
});
export type UpdateGalleryItemDTO = z.infer<typeof UpdateGalleryItemDTO>;

export const ReorderGalleryItemsDTO = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
export type ReorderGalleryItemsDTO = z.infer<typeof ReorderGalleryItemsDTO>;

export const BulkAddGalleryItemsDTO = z.object({
  items: z.array(AddGalleryItemDTO).min(1).max(100),
});
export type BulkAddGalleryItemsDTO = z.infer<typeof BulkAddGalleryItemsDTO>;

export const GallerySearchDTO = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mimePrefix: z.string().optional(), // e.g. 'image/' or 'video/'
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(200).default(50),
});
export type GallerySearchDTO = z.infer<typeof GallerySearchDTO>;
