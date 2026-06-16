import { extensionRegistry } from '@nb/common/server/extension-registry';
import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProviderService } from '../auth_sso.types';
import type { SSOProviderContribution } from '../auth_sso.provider.types';
import type { BaseSSOProvider } from './base.provider';
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
import { YandexProvider } from './yandex.provider';
import { VkProvider } from './vk.provider';
import { QQProvider } from './qq.provider';
import { WeiboProvider } from './weibo.provider';
import { AlipayProvider } from './alipay.provider';

const SSO_PROVIDER_POINT = 'auth_sso:provider';

/**
 * Not-yet-migrated providers, still in-tree. Migrated providers live in their own
 * satellite module (auth_sso_<key>) and are discovered via the extension
 * registry; this is the fallback for the rest (Partial — the set shrinks as
 * providers move out).
 */
const PROVIDER_FACTORIES: Partial<Record<SSOProvider, () => BaseSSOProvider>> = {
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
  yandex: () => new YandexProvider(),
  vk: () => new VkProvider(),
  qq: () => new QQProvider(),
  weibo: () => new WeiboProvider(),
  alipay: () => new AlipayProvider(),
};

const providerInstances: Partial<Record<SSOProvider, SSOProviderService>> = {};

/**
 * Resolve the SSO provider implementation for a key. Satellite contributions
 * (extension registry) win; otherwise the in-tree factory is used. Async because
 * satellite implementations are lazy-loaded.
 */
export async function getProvider(provider: SSOProvider): Promise<SSOProviderService> {
  const cached = providerInstances[provider];
  if (cached) return cached;

  let instance: SSOProviderService;
  const contrib = extensionRegistry
    .getContributions(SSO_PROVIDER_POINT)
    .find((c) => c.key === provider);
  if (contrib) {
    const impl = await extensionRegistry.load<SSOProviderContribution>(contrib);
    instance = impl.create();
  } else {
    const factory = PROVIDER_FACTORIES[provider];
    if (!factory) throw new Error(`Unknown SSO provider: ${provider}`);
    instance = factory();
  }
  providerInstances[provider] = instance;
  return instance;
}
