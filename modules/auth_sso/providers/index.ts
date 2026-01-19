import type { SSOProvider } from '../auth_sso.enums';
import type { SSOProviderService } from '../auth_sso.types';
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

const providerInstances: Partial<Record<SSOProvider, SSOProviderService>> = {};

export function getProvider(provider: SSOProvider): SSOProviderService {
  if (!providerInstances[provider]) {
    switch (provider) {
      case 'google':
        providerInstances[provider] = new GoogleProvider();
        break;
      case 'github':
        providerInstances[provider] = new GithubProvider();
        break;
      case 'microsoft':
        providerInstances[provider] = new MicrosoftProvider();
        break;
      case 'linkedin':
        providerInstances[provider] = new LinkedInProvider();
        break;
      case 'apple':
        providerInstances[provider] = new AppleProvider();
        break;
      case 'facebook':
        providerInstances[provider] = new FacebookProvider();
        break;
      case 'twitter':
        providerInstances[provider] = new TwitterProvider();
        break;
      case 'tiktok':
        providerInstances[provider] = new TikTokProvider();
        break;
      case 'slack':
        providerInstances[provider] = new SlackProvider();
        break;
      case 'wechat':
        providerInstances[provider] = new WeChatProvider();
        break;
      case 'autodesk':
        providerInstances[provider] = new AutodeskProvider();
        break;
      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  }

  return providerInstances[provider]!;
}
