import { z } from 'zod';

export const SeoEntityTypeEnum = z.enum([
  'store_category',
  'store_product',
  'store_bundle',
]);
export type SeoEntityType = z.infer<typeof SeoEntityTypeEnum>;
