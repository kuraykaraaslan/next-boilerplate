import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { type AcsProvider } from './auth_acs.enums';
import type { AcsProfile } from './auth_acs.types';
import AuthAcsConfigService from './auth_acs.config.service';
import AuthAcsFlowService, { type AcsFlowContext } from './auth_acs.flow.service';
import { getAcsProvider } from './providers';
import AcsMessages from './auth_acs.messages';

/**
 * Facade for the national-identity (ACS) module. Dispatches by provider; the
 * underlying provider object handles the SAML-or-OIDC transport while the flow
 * service owns the protocol-agnostic identity resolution.
 */
export default class AuthAcsService {
  static assertKnown = AuthAcsConfigService.assertKnown.bind(AuthAcsConfigService);
  static isEnabled = AuthAcsConfigService.isEnabled.bind(AuthAcsConfigService);
  static enabledProviders = AuthAcsConfigService.enabledProviders.bind(AuthAcsConfigService);
  static resolveConfig = AuthAcsConfigService.resolveConfig.bind(AuthAcsConfigService);
  static resolveOrProvisionUser = AuthAcsFlowService.resolveOrProvisionUser.bind(AuthAcsFlowService);
  static linkToUser = AuthAcsFlowService.linkToUser.bind(AuthAcsFlowService);

  /** Build the IdP redirect URL. `relayState` round-trips tenant/link context. */
  static async generateAuthUrl(provider: AcsProvider, relayState: string): Promise<string> {
    AuthAcsConfigService.assertEnabled(provider);
    return (await getAcsProvider(provider)).generateAuthUrl(relayState);
  }

  /** Validate the IdP callback into a normalised national-identity profile. */
  static async validateCallback(provider: AcsProvider, body: Record<string, string>): Promise<AcsProfile> {
    AuthAcsConfigService.assertEnabled(provider);
    return (await getAcsProvider(provider)).validateCallback(body);
  }

  /** SP metadata XML (SAML providers only). */
  static async generateMetadata(provider: AcsProvider): Promise<string> {
    const svc = await getAcsProvider(provider);
    if (svc.protocol !== 'saml' || !svc.generateMetadata) {
      throw new AppError(AcsMessages.METADATA_UNAVAILABLE, 400, ErrorCode.VALIDATION_ERROR);
    }
    return svc.generateMetadata();
  }

  static async authenticate(
    provider: AcsProvider, body: Record<string, string>, ctx: AcsFlowContext = {},
  ): Promise<{ user: import('@nb/user/server/user.types').SafeUser; isNewUser: boolean; profile: AcsProfile }> {
    const profile = await AuthAcsService.validateCallback(provider, body);
    const { user, isNewUser } = await AuthAcsFlowService.resolveOrProvisionUser(profile, ctx);
    return { user, isNewUser, profile };
  }
}
