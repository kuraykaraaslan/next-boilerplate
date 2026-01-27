import { z } from 'zod';
import { SocialLinkPlatformEnum } from './user_profile.enums';

export const UpdateSocialLinkItemSchema = z.object({
  id: z.string().uuid(),
  platform: SocialLinkPlatformEnum,
  url: z.string().url().nullable(),
  order: z.number().int().nonnegative()
});

export const UpdateProfileRequestSchema = z.object({
  name: z.string().nullable().nullable(),
  biography: z.string().nullable().nullable(),
  profilePicture: z.string().nullable().nullable(),
  headerImage: z.string().nullable().nullable(),
  socialLinks: z.array(UpdateSocialLinkItemSchema).nullable().transform((val) => val ?? []),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
