import { z } from 'zod';
import { SSOProviderEnum } from '../sso/sso.enums';

export { SSOProviderEnum as SocialAccountProviderEnum };
export type SocialAccountProvider = z.infer<typeof SSOProviderEnum>;
