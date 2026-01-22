import { z } from 'zod';
import { SocialAccountProviderEnum } from './user_social_account.enums';

export const UserSocialAccountSchema = z.object({
  userSocialAccountId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: SocialAccountProviderEnum,
  providerId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  profilePicture: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable()
});

export const SafeUserSocialAccountSchema = UserSocialAccountSchema.omit({
  accessToken: true,
  refreshToken: true
});

export type UserSocialAccount = z.infer<typeof UserSocialAccountSchema>;
export type SafeUserSocialAccount = z.infer<typeof SafeUserSocialAccountSchema>;
