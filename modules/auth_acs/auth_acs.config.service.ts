import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { AcsProviderEnum, type AcsProvider } from './auth_acs.enums';
import { ACS_CATALOG } from './auth_acs.config';
import { AcsProviderMapSchema, type AcsResolvedConfig, type AcsProviderEnvEntry } from './auth_acs.types';
import AcsMessages from './auth_acs.messages';

const APP_HOST = env.APPLICATION_HOST || 'http://localhost:3000';

/**
 * Resolves per-provider runtime config by merging the static catalog defaults
 * with the deployment's ACS_PROVIDER_MAP (a single validated JSON env blob,
 * mirroring the existing EID_PROVIDER_MAP convention). Parsed once and memoised.
 */
export default class AuthAcsConfigService {
  private static _map: Record<string, AcsProviderEnvEntry> | null = null;

  private static parseMap(): Record<string, AcsProviderEnvEntry> {
    if (AuthAcsConfigService._map) return AuthAcsConfigService._map;
    const raw = env.ACS_PROVIDER_MAP;
    if (!raw) return (AuthAcsConfigService._map = {});
    try {
      const parsed = AcsProviderMapSchema.parse(JSON.parse(raw));
      return (AuthAcsConfigService._map = parsed);
    } catch (err) {
      Logger.warn(`[auth_acs] ACS_PROVIDER_MAP is invalid JSON/shape — all providers disabled: ${err instanceof Error ? err.message : String(err)}`);
      return (AuthAcsConfigService._map = {});
    }
  }

  /** Allow tests to reset the memoised map after mutating env. */
  static resetCache(): void {
    AuthAcsConfigService._map = null;
  }

  static isKnownProvider(provider: string): provider is AcsProvider {
    return AcsProviderEnum.safeParse(provider).success;
  }

  static assertKnown(provider: string): AcsProvider {
    if (!AuthAcsConfigService.isKnownProvider(provider)) {
      throw new AppError(AcsMessages.UNKNOWN_PROVIDER, 404, ErrorCode.NOT_FOUND);
    }
    return provider;
  }

  static resolveConfig(provider: AcsProvider): AcsResolvedConfig {
    const cat = ACS_CATALOG[provider];
    const entry = AuthAcsConfigService.parseMap()[provider] ?? {};
    const d = cat.defaults;

    const cfg: AcsResolvedConfig = {
      provider,
      protocol: cat.protocol,
      country: cat.country,
      enabled: entry.enabled ?? false,
      allowJit: entry.allowJit ?? true,
      attrNationalId: entry.attrNationalId ?? d.attrNationalId,
      attrFirstName: entry.attrFirstName ?? d.attrFirstName ?? 'firstName',
      attrLastName: entry.attrLastName ?? d.attrLastName ?? 'lastName',

      // SAML
      idpEntityId: entry.idpEntityId,
      idpSsoUrl: entry.idpSsoUrl,
      idpCertificate: entry.idpCertificate,
      spEntityId: entry.spEntityId ?? AuthAcsConfigService.spEntityId(provider),
      spPrivateKey: entry.spPrivateKey,
      spCertificate: entry.spCertificate,
      spDecryptionKey: entry.spDecryptionKey ?? entry.spPrivateKey,
      nameIdFormat: entry.nameIdFormat ?? d.nameIdFormat,
      wantAssertionsSigned: entry.wantAssertionsSigned ?? true,
      signatureAlgorithm: entry.signatureAlgorithm ?? 'sha256',
      loa: entry.loa,

      // OIDC
      issuer: entry.issuer ?? d.issuer,
      jwksUri: entry.jwksUri,
      authUrl: entry.authUrl ?? d.authUrl,
      tokenUrl: entry.tokenUrl ?? d.tokenUrl,
      userInfoUrl: entry.userInfoUrl ?? d.userInfoUrl,
      clientId: entry.clientId,
      clientSecret: entry.clientSecret,
      privateKeyJwt: entry.privateKeyJwt,
      redirectUri: entry.redirectUri ?? AuthAcsConfigService.callbackUrl(provider),
      scopes: entry.scopes ?? d.scopes ?? ['openid'],
      usesPkce: entry.usesPkce ?? d.usesPkce ?? false,
      signingCert: entry.signingCert,
      signingKey: entry.signingKey,
    };
    return cfg;
  }

  /**
   * A provider is usable when it is enabled AND has the minimum transport config.
   * SAML needs the IdP SSO URL + cert; OIDC needs an auth+token URL and client id.
   */
  static isEnabled(provider: AcsProvider): boolean {
    const c = AuthAcsConfigService.resolveConfig(provider);
    if (!c.enabled) return false;
    if (c.protocol === 'saml') return Boolean(c.idpSsoUrl && c.idpCertificate);
    return Boolean(c.authUrl && c.tokenUrl && c.clientId);
  }

  static assertEnabled(provider: AcsProvider): AcsResolvedConfig {
    const c = AuthAcsConfigService.resolveConfig(provider);
    if (!c.enabled) throw new AppError(AcsMessages.NOT_ENABLED, 403, ErrorCode.FORBIDDEN);
    const ok = c.protocol === 'saml'
      ? Boolean(c.idpSsoUrl && c.idpCertificate)
      : Boolean(c.authUrl && c.tokenUrl && c.clientId);
    if (!ok) throw new AppError(AcsMessages.NOT_CONFIGURED, 400, ErrorCode.VALIDATION_ERROR);
    return c;
  }

  /** Enabled-and-configured providers, for rendering login buttons. */
  static enabledProviders(): AcsProvider[] {
    return (Object.keys(ACS_CATALOG) as AcsProvider[]).filter((p) => AuthAcsConfigService.isEnabled(p));
  }

  // ── URLs (platform-level; provider segment gives each a unique fixed ACS) ────
  static callbackUrl(provider: AcsProvider): string {
    return `${APP_HOST}/api/auth/acs/${provider}/callback`;
  }
  static spEntityId(provider: AcsProvider): string {
    return `${APP_HOST}/api/auth/acs/${provider}/metadata`;
  }
  static metadataUrl(provider: AcsProvider): string {
    return `${APP_HOST}/api/auth/acs/${provider}/metadata`;
  }
}
