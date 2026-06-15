import { z } from 'zod';
import { ConsentPurposeEnum, ConsentSourceEnum } from './terms_consent.enums';

export const ConsentRecordSchema = z.object({
  consentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  subjectUserId: z.string().uuid().nullable(),
  subjectAnonymousId: z.string().nullable(),
  purpose: ConsentPurposeEnum,
  granted: z.boolean(),
  policyVersion: z.string(),
  source: ConsentSourceEnum,
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

// A single purpose row rendered in the cookie banner.
export const BannerPurposeSchema = z.object({
  key: ConsentPurposeEnum,
  label: z.string(),
  description: z.string(),
  // Required purposes (e.g. `necessary`) render as a disabled, always-on toggle.
  required: z.boolean(),
});
export type BannerPurpose = z.infer<typeof BannerPurposeSchema>;

// The per-tenant cookie-consent banner configuration (stored via SettingService).
export const BannerConfigSchema = z.object({
  enabled: z.boolean(),
  policyVersion: z.string(),
  bannerTitle: z.string(),
  bannerMessage: z.string(),
  purposes: z.array(BannerPurposeSchema),
});
export type BannerConfig = z.infer<typeof BannerConfigSchema>;

// The current consent decision per purpose for one subject.
export type ConsentState = Record<string, boolean>;
