import { z } from 'zod';
import { SocialAccountProviderEnum } from './user_social_account.enums';

export const UserSocialAccountSchema = z.object({
  userSocialAccountId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: SocialAccountProviderEnum,
  providerId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  profilePicture: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const SafeUserSocialAccountSchema = UserSocialAccountSchema.omit({
  accessToken: true,
  refreshToken: true
});

export type UserSocialAccount = z.infer<typeof UserSocialAccountSchema>;
export type SafeUserSocialAccount = z.infer<typeof SafeUserSocialAccountSchema>;
