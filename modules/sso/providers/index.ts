import type { SSOProvider } from '../sso.enums';
import type { SSOProviderService } from '../sso.types';
import { GoogleProvider } from './google.provider';
import { GithubProvider } from './github.provider';
import { MicrosoftProvider } from './microsoft.provider';
import { LinkedInProvider } from './linkedin.provider';

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
      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  }

  return providerInstances[provider]!;
}
