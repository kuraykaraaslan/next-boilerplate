import { z } from 'zod';

export const AddGalleryItemDTO = z.object({
  uploadedFileId: z.string().uuid(),
  altText:        z.string().max(300).optional(),
  title:          z.string().max(200).optional(),
  sortOrder:      z.number().int().nonnegative().default(0),
  isPrimary:      z.boolean().default(false),
});
export type AddGalleryItemDTO = z.infer<typeof AddGalleryItemDTO>;

export const UpdateGalleryItemDTO = z.object({
  altText:   z.string().max(300).optional(),
  title:     z.string().max(200).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isPrimary: z.boolean().optional(),
});
export type UpdateGalleryItemDTO = z.infer<typeof UpdateGalleryItemDTO>;

export const ReorderGalleryItemsDTO = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
export type ReorderGalleryItemsDTO = z.infer<typeof ReorderGalleryItemsDTO>;
