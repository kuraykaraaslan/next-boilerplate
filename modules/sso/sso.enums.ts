import { z } from 'zod';

export const SSOProviderEnum = z.enum([
  'google',
  'apple',
  'facebook',
  'github',
  'linkedin',
  'microsoft',
  'twitter',
  'slack',
  'tiktok',
  'wechat',
  'autodesk'
]);

export type SSOProvider = z.infer<typeof SSOProviderEnum>;
