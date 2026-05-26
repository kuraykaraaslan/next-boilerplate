import { z } from 'zod';
import { SeoEntityTypeEnum } from './seo.enums';

export const UpsertSeoDTO = z.object({
  title:         z.string().max(200).optional(),
  description:   z.string().max(500).optional(),
  keywords:      z.array(z.string().max(100)).max(30).optional(),
  ogTitle:       z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
  ogImageUrl:    z.string().url().optional().or(z.literal('')),
  canonicalUrl:  z.string().url().optional().or(z.literal('')),
  noIndex:       z.boolean().default(false),
});
export type UpsertSeoDTO = z.infer<typeof UpsertSeoDTO>;

export const SeoRouteParamsDTO = z.object({
  entityType: SeoEntityTypeEnum,
  entityId:   z.string().uuid(),
});
