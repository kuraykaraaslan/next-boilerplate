import crypto from 'crypto';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { BaseOidcProvider } from '@/modules/auth_oidc/auth_oidc.engine';
import type { AcsProvider } from '../auth_acs.enums';
import type { AcsProfile, AcsProviderService, AcsResolvedConfig } from '../auth_acs.types';
import AcsMessages from '../auth_acs.messages';
import AuthAcsConfigService from '../auth_acs.config.service';

/**
 * OIDC base for national IdPs that speak OIDC/OAuth2 (Uzbekistan OneID, Azerbaijan
 * MyGov ID, US Login.gov / ID.me …). All the OAuth mechanics live in the shared
 * `auth_sso` engine; this class only adds the national-identity concern: map the
 * raw claims into an `AcsProfile` keyed on a hashed national identifier.
 */
export abstract class BaseOidcAcsProvider extends BaseOidcProvider implements AcsProviderService {
  readonly protocol = 'oidc' as const;
  protected provider: AcsProvider;
  protected config: AcsResolvedConfig;

  constructor(provider: AcsProvider) {
    const c = AuthAcsConfigService.resolveConfig(provider);
    super({
      authUrl: c.authUrl,
      tokenUrl: c.tokenUrl,
      userInfoUrl: c.userInfoUrl,
      clientId: c.clientId,
      clientSecret: c.clientSecret,
      privateKeyJwt: c.privateKeyJwt,
      redirectUri: c.redirectUri ?? AuthAcsConfigService.callbackUrl(provider),
      scopes: c.scopes ?? ['openid'],
      usesPkce: c.usesPkce,
      pkceSalt: `acs-pkce:${provider}`,
    });
    this.provider = provider;
    this.config = c;
  }

  async validateCallback(body: Record<string, string>): Promise<AcsProfile> {
    const code = body.code;
    const state = body.state ?? '';
    if (!code) throw new AppError(AcsMessages.STATE_INVALID, 400, ErrorCode.VALIDATION_ERROR);

    const claims = await this.getClaims(code, state);
    const mapped = this.mapClaims(claims);
    if (!mapped.nationalId) throw new AppError(AcsMessages.NATIONAL_ID_MISSING, 400, ErrorCode.VALIDATION_ERROR);

    const exp = typeof claims.exp === 'number' ? claims.exp * 1000 : null;
    return {
      ...mapped,
      nationalIdHash: crypto.createHash('sha256').update(mapped.nationalId.trim()).digest('hex'),
      nameId: mapped.nationalId,
      assertionId: typeof claims.jti === 'string' ? claims.jti : null,
      sessionIndex: typeof claims.sid === 'string' ? claims.sid : null,
      sessionNotOnOrAfter: exp,
    };
  }

  /** Map raw OIDC claims to an AcsProfile. Default reads the configured claim names. */
  protected mapClaims(claims: Record<string, unknown>): AcsProfile {
    const c = this.config;
    const pick = (k: string): string | null => {
      const v = claims[k];
      return v == null ? null : String(v);
    };
    const nationalId = pick(c.attrNationalId) ?? pick('sub') ?? '';
    return {
      provider: this.provider,
      country: c.country,
      nationalId,
      nationalIdHash: '',
      firstName: pick(c.attrFirstName),
      lastName: pick(c.attrLastName),
    };
  }
}
