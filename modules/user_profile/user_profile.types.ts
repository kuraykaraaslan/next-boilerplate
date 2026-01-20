import { z } from 'zod';
import { SocialLinkPlatformEnum } from './user_profile.enums';

export const SocialLinkItemSchema = z.object({
  id: z.string().uuid(),
  platform: SocialLinkPlatformEnum,
  url: z.string().url().nullable(),
  order: z.number().int().nonnegative()
});

export const SocialLinksSchema = z.array(SocialLinkItemSchema).default([]);

export const UserProfileSchema = z.object({
  name: z.string().nullable(),
  biography: z.string().nullable(),
  profilePicture: z.string().nullable(),
  headerImage: z.string().nullable(),
  socialLinks: SocialLinksSchema
});


export const UserProfileDefault: z.infer<typeof UserProfileSchema> = {
  name: null,
  biography: null,
  profilePicture: null,
  headerImage: null,
  socialLinks: []
};

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type SocialLinkItem = z.infer<typeof SocialLinkItemSchema>;