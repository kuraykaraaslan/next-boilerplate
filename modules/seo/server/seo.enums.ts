import { z } from 'zod';

export const SeoEntityTypeEnum = z.enum([
  'store_category',
  'store_product',
  'store_bundle',
  'dynamic_page',
]);
export type SeoEntityType = z.infer<typeof SeoEntityTypeEnum>;
