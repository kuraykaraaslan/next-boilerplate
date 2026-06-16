import { z } from 'zod';

export const GalleryEntityTypeEnum = z.enum([
  'store_category',
  'store_product',
  'store_bundle',
  'store_variant',
]);
export type GalleryEntityType = z.infer<typeof GalleryEntityTypeEnum>;
