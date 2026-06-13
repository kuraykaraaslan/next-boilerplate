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
  twitterTitle:       z.string().nullable().optional(),
  twitterDescription: z.string().nullable().optional(),
  twitterCard:        z.string().nullable().optional(),
  localized:     z.record(z.string(), z.record(z.string(), z.string())).nullable().optional(),
  alternates:    z.record(z.string(), z.string()).nullable().optional(),
  xDefaultUrl:   z.string().nullable().optional(),
  noIndex:       z.boolean(),
  updatedAt:     z.date(),
});
export type SeoMeta = z.infer<typeof SeoMetaSchema>;
