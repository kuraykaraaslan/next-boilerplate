import { z } from 'zod';
import { SeoEntityTypeEnum } from './seo.enums';

export const SeoMetaSchema = z.object({
  seoId:         z.string().uuid(),
  tenantId:      z.string().uuid(),
  entityType:    SeoEntityTypeEnum,
  entityId:      z.string().uuid(),
  title:         z.string().nullable().optional(),
  description:   z.string().nullable().optional(),
  keywords:      z.array(z.string()).nullable().optional(),
  ogTitle:       z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  ogImageUrl:    z.string().nullable().optional(),
  canonicalUrl:  z.string().nullable().optional(),
  noIndex:       z.boolean(),
  updatedAt:     z.date(),
});
export type SeoMeta = z.infer<typeof SeoMetaSchema>;
