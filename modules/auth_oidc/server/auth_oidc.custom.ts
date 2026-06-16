import { BaseOidcProvider, type OidcEngineConfig } from './auth_oidc.engine';

/** Claim-name mapping for a bring-your-own OIDC IdP (sensible OIDC defaults). */
export interface OidcClaimMap {
  sub?: string;
  email?: string;
  emailVerified?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

/** Normalised profile from a custom OIDC IdP. */
export interface CustomOidcProfile {
  sub: string;
  email: string | null;
  emailVerified: boolean | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  raw: Record<string, unknown>;
}

/**
 * Bring-your-own / custom OIDC provider — the OIDC analogue of the per-tenant
 * custom SAML support in `auth_saml`. An admin (or a tenant-settings store)
 * supplies the issuer/client config + claim mapping; this class drives the
 * standard OIDC flow via the shared engine and returns a normalised profile.
 */
export class CustomOidcProvider extends BaseOidcProvider {
  private claims: Required<OidcClaimMap>;

  constructor(config: Omit<OidcEngineConfig, 'pkceSalt'> & { pkceSalt?: string; id?: string }, claimMap: OidcClaimMap = {}) {
    super({ usesPkce: true, ...config, pkceSalt: config.pkceSalt ?? `oidc-custom:${config.id ?? config.clientId ?? 'idp'}` });
    this.claims = {
      sub: claimMap.sub ?? 'sub',
      email: claimMap.email ?? 'email',
      emailVerified: claimMap.emailVerified ?? 'email_verified',
      name: claimMap.name ?? 'name',
      firstName: claimMap.firstName ?? 'given_name',
      lastName: claimMap.lastName ?? 'family_name',
      picture: claimMap.picture ?? 'picture',
    };
  }

  /** Run the authorization-code flow and return the mapped profile. */
  async getProfile(code: string, state?: string): Promise<CustomOidcProfile> {
    const claims = await this.getClaims(code, state);
    const str = (k: string): string | null => (claims[k] == null ? null : String(claims[k]));
    return {
      sub: str(this.claims.sub) ?? '',
      email: str(this.claims.email),
      emailVerified: typeof claims[this.claims.emailVerified] === 'boolean' ? (claims[this.claims.emailVerified] as boolean) : null,
      name: str(this.claims.name),
      firstName: str(this.claims.firstName),
      lastName: str(this.claims.lastName),
      picture: str(this.claims.picture),
      raw: claims,
    };
  }
}
