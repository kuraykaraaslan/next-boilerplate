import { z } from 'zod';
import { SSOProviderEnum } from './auth_sso.enums';

export const SSOProfileSchema = z.object({
  sub: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  provider: SSOProviderEnum
});

export const SSOTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().nullable()
});

export const SSOCallbackResultSchema = z.object({
  profile: SSOProfileSchema,
  tokens: SSOTokensSchema
});

export type SSOProfile = z.infer<typeof SSOProfileSchema>;
export type SSOTokens = z.infer<typeof SSOTokensSchema>;
export type SSOCallbackResult = z.infer<typeof SSOCallbackResultSchema>;

export interface SSOProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackPath: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  scopes: string[];
}

export interface SSOProviderService {
  generateAuthUrl(state?: string): string;
  getTokens(code: string): Promise<SSOTokens>;
  getUserInfo(accessToken: string): Promise<SSOProfile>;
}
