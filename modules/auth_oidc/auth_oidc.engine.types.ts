export interface OidcEngineConfig {
  /** OIDC issuer; when set, missing endpoints + jwks_uri are auto-discovered. */
  issuer?: string;
  authUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  jwksUri?: string;
  clientId?: string;
  clientSecret?: string;
  /** PEM private key for `private_key_jwt` client authentication (e.g. Login.gov). */
  privateKeyJwt?: string;
  redirectUri: string;
  scopes: string[];
  usesPkce?: boolean;
  /** Send credentials as HTTP Basic instead of in the token body (confidential clients). */
  useBasicAuth?: boolean;
  /** Salt that namespaces the deterministic PKCE verifier derived from `state`. */
  pkceSalt: string;
  /** Leeway (seconds) for id_token exp/nbf. Default 60. */
  clockToleranceSec?: number;
}

export interface OidcTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  scope: string | null;
  raw: Record<string, unknown>;
}

export interface OidcAuthUrlOptions {
  uiLocales?: string;
  loginHint?: string;
  /** OIDC nonce — bound into the id_token and verified on callback (replay defence). */
  nonce?: string;
  extraParams?: Record<string, string>;
}

export const HTTP_TIMEOUT_MS = 10_000;
