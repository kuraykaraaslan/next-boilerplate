import { z } from 'zod';
import {
  SocialLinkPlatformEnum,
  ProfileVisibilityEnum,
  VerificationStatusEnum,
  NameOrderEnum,
} from './user_profile.enums';

export const SocialLinkItemSchema = z.object({
  id: z.string().uuid(),
  platform: SocialLinkPlatformEnum,
  url: z.string().url().nullable(),
  order: z.number().int().nonnegative()
});

export const SocialLinksSchema = z.array(SocialLinkItemSchema).default([]);

export const UserProfileSchema = z.object({
  name: z.string().nullable(),
  // Structured / localized name fields (directory-service mapping, correct
  // formatting for cultures where family name precedes given name).
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  displayName: z.string().nullable().default(null),
  nameOrder: NameOrderEnum.default('GIVEN_FIRST'),
  pronouns: z.string().max(40).nullable().default(null),
  biography: z.string().nullable(),
  profilePicture: z.string().nullable(),
  headerImage: z.string().nullable(),
  socialLinks: SocialLinksSchema,
  // Visibility: overall + per-field overrides (field name → visibility).
  visibility: ProfileVisibilityEnum.default('PUBLIC'),
  fieldVisibility: z.record(z.string(), ProfileVisibilityEnum).default({}),
  // Identity verification (verified badge / KYC gate).
  isVerified: z.boolean().default(false),
  verificationStatus: VerificationStatusEnum.default('UNVERIFIED'),
  // Per-tenant custom fields (JSONB extension — department, vatNumber, CPF...).
  customFields: z.record(z.string(), z.unknown()).default({}),
  // GDPR erasure marker.
  anonymizedAt: z.coerce.date().nullable().default(null),
});


export const UserProfileDefault: z.infer<typeof UserProfileSchema> = {
  name: null,
  firstName: null,
  lastName: null,
  displayName: null,
  nameOrder: 'GIVEN_FIRST',
  pronouns: null,
  biography: null,
  profilePicture: null,
  headerImage: null,
  socialLinks: [],
  visibility: 'PUBLIC',
  fieldVisibility: {},
  isVerified: false,
  verificationStatus: 'UNVERIFIED',
  customFields: {},
  anonymizedAt: null,
};

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type SocialLinkItem = z.infer<typeof SocialLinkItemSchema>;
