import crypto from 'crypto';
import type { SSOProvider } from '../auth_sso.enums';
import type {
  SSOProviderService, SSOProviderConfig, SSOTokens, SSOProfile, SSOAuthUrlOptions,
} from '../auth_sso.types';

type Invoke = (op: string, input: unknown) => Promise<unknown>;

/** Config + per-provider flags/mapping the facade needs (callbackUrl resolved host-side). */
export interface IsolatedSsoConfig extends SSOProviderConfig {
  callbackUrl: string;
  usesPkce?: boolean;
  /** Manifest extension metadata: profileMap (claim→field) + flow flags. */
  meta?: Record<string, unknown>;
}

// PKCE verifier derived deterministically from `state` (high-entropy, single-use) so
// the host can build the code_challenge and the isolate can recompute the verifier
// for the token exchange — without sharing a secret.
function deriveVerifier(state: string): string {
  return crypto.createHash('sha256').update(state || '').digest('base64url');
}
function challengeOf(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Host-facing facade that runs a social-login (SSO) provider as a SANDBOXED community
 * plugin. `generateAuthUrl` is pure URL building (host-side, sync). The egress (code→
 * token exchange, userinfo fetch + mapping) runs in the isolate; the client secret /
 * signing key never enter it (broker injects {{secret:…}} / signs host-side). Config +
 * per-provider mapping/flags come from the manifest metadata.
 */
export class IsolatedSsoProvider implements SSOProviderService {
  constructor(private readonly provider: SSOProvider, private readonly config: IsolatedSsoConfig, private readonly invoke: Invoke) {}

  /** Non-secret config handed to the isolate (client secret stays host-side). */
  private publicConfig(): Record<string, unknown> {
    const rest: Record<string, unknown> = { ...this.config, provider: this.provider };
    delete rest.clientSecret;
    return rest;
  }

  generateAuthUrl(state = '', options?: SSOAuthUrlOptions): string {
    const c = this.config;
    const u = new URL(c.authUrl);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('client_id', c.clientId);
    u.searchParams.set('redirect_uri', c.callbackUrl);
    u.searchParams.set('scope', (c.scopes ?? []).join(' '));
    u.searchParams.set('state', state);
    if (c.usesPkce) {
      u.searchParams.set('code_challenge', challengeOf(deriveVerifier(state)));
      u.searchParams.set('code_challenge_method', 'S256');
    }
    if (options?.uiLocales) u.searchParams.set('ui_locales', options.uiLocales);
    if (options?.loginHint) u.searchParams.set('login_hint', options.loginHint);
    return u.toString();
  }

  async getTokens(code: string, state?: string): Promise<SSOTokens> {
    return (await this.invoke('getTokens', {
      config: this.publicConfig(),
      code,
      codeVerifier: this.config.usesPkce ? deriveVerifier(state ?? '') : undefined,
    })) as SSOTokens;
  }

  async getUserInfo(accessToken: string, tokens?: SSOTokens): Promise<SSOProfile> {
    return (await this.invoke('getUserInfo', { config: this.publicConfig(), accessToken, tokens })) as SSOProfile;
  }
}
