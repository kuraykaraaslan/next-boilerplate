import { z } from 'zod';
import { SSOProviderEnum } from '../auth_sso/auth_sso.enums';

export { SSOProviderEnum as SocialAccountProviderEnum };
export type SocialAccountProvider = z.infer<typeof SSOProviderEnum>;
