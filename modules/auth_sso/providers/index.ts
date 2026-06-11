import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProviderService } from '../auth_sso.types';
import type { BaseSSOProvider } from './base.provider';
import { GoogleProvider } from './google.provider';
import { GithubProvider } from './github.provider';
import { MicrosoftProvider } from './microsoft.provider';
import { LinkedInProvider } from './linkedin.provider';
import { AppleProvider } from './apple.provider';
import { FacebookProvider } from './facebook.provider';
import { TwitterProvider } from './twitter.provider';
import { TikTokProvider } from './tiktok.provider';
import { SlackProvider } from './slack.provider';
import { WeChatProvider } from './wechat.provider';
import { AutodeskProvider } from './autodesk.provider';

/**
 * Type-safe provider registry (GOODTOHAVE: DX). Replacing the `switch` with a
 * `Record<SSOProvider, …>` makes the compiler enforce completeness — adding a
 * provider to `SSOProviderEnum` without registering its factory here is a
 * compile error, not a runtime `default:` throw.
 */
const PROVIDER_FACTORIES: Record<SSOProvider, () => BaseSSOProvider> = {
  google: () => new GoogleProvider(),
  github: () => new GithubProvider(),
  microsoft: () => new MicrosoftProvider(),
  linkedin: () => new LinkedInProvider(),
  apple: () => new AppleProvider(),
  facebook: () => new FacebookProvider(),
  twitter: () => new TwitterProvider(),
  tiktok: () => new TikTokProvider(),
  slack: () => new SlackProvider(),
  wechat: () => new WeChatProvider(),
  autodesk: () => new AutodeskProvider(),
};

const providerInstances: Partial<Record<SSOProvider, SSOProviderService>> = {};

export function getProvider(provider: SSOProvider): SSOProviderService {
  let instance = providerInstances[provider];
  if (!instance) {
    instance = PROVIDER_FACTORIES[provider]();
    providerInstances[provider] = instance;
  }
  return instance;
}
