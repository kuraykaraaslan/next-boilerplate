import { z } from 'zod';
import { SocialLinkPlatformEnum } from './user_profile.enums';

export const UpdateSocialLinkItemSchema = z.object({
  id: z.string().uuid(),
  platform: SocialLinkPlatformEnum,
  url: z.string().url().nullable(),
  order: z.number().int().nonnegative()
});

export const UpdateProfileRequestSchema = z.object({
  name: z.string().nullable().optional(),
  biography: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  headerImage: z.string().nullable().optional(),
  socialLinks: z.array(UpdateSocialLinkItemSchema).optional()
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
