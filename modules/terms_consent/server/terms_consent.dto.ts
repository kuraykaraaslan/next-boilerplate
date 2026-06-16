import { z } from 'zod';
import { ConsentPurposeEnum, ConsentSourceEnum } from './terms_consent.enums';

// A single consent decision for one purpose.
export const RecordConsentDTO = z.object({
  purpose: ConsentPurposeEnum,
  granted: z.boolean(),
  policyVersion: z.string().max(64).optional(),
  source: ConsentSourceEnum.optional(),
  userId: z.string().uuid().optional(),
  anonymousId: z.string().max(256).optional(),
});

// A banner submission: many decisions in one request (one per purpose).
export const RecordManyDTO = z.object({
  decisions: z
    .array(z.object({ purpose: ConsentPurposeEnum, granted: z.boolean() }))
    .min(1)
    .max(20),
  policyVersion: z.string().max(64).optional(),
  userId: z.string().uuid().optional(),
  anonymousId: z.string().max(256).optional(),
});

export const ListConsentQuery = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  purpose: ConsentPurposeEnum.optional(),
  granted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  subjectUserId: z.string().uuid().optional(),
});

export const UpdateBannerConfigDTO = z.object({
  enabled: z.boolean().optional(),
  policyVersion: z.string().min(1).max(64).optional(),
  bannerTitle: z.string().max(200).optional(),
  bannerMessage: z.string().max(2000).optional(),
  purposes: z
    .array(
      z.object({
        key: ConsentPurposeEnum,
        label: z.string().max(120),
        description: z.string().max(500),
        required: z.boolean(),
      }),
    )
    .max(20)
    .optional(),
});

export type RecordConsentInput = z.infer<typeof RecordConsentDTO>;
export type RecordManyInput = z.infer<typeof RecordManyDTO>;
export type ListConsentQueryInput = z.infer<typeof ListConsentQuery>;
export type UpdateBannerConfigInput = z.infer<typeof UpdateBannerConfigDTO>;
