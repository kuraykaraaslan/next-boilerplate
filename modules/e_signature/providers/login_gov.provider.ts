import { env } from '@/modules/env';
import BaseESignatureProvider, {
  InitiateLoginInput,
  InitiateLoginOutput,
  ProviderCredentials,
} from './base.provider';
import type { CountryCode, PollResult, RawIdentityClaims } from '../e_signature.types';
import type { LoA, ProviderCapability } from '../e_signature.enums';
import { E_SIGNATURE_MESSAGES } from '../e_signature.messages';

/**
 * United States — Login.gov adapter.
 *
 * Login.gov is OIDC-based and uses an interactive redirect flow rather than
 * the QR/PIN polling flow that Smart-ID or Mobil Imza use. The actual login
 * is therefore performed through the existing `auth_sso` OIDC bridge; this
 * adapter exists so:
 *   (a) the country picker surfaces `US` as supported when Login.gov is
 *       configured, and
 *   (b) the system-admin overview shows Login.gov as a wired provider.
 *
 * Calling `initiateLogin` here returns a `PROVIDER_CAPABILITY_MISSING`
 * error with a `redirectTo` hint in the message so the calling UI can hand
 * the user off to the OIDC flow instead. (For a full polling-style adapter,
 * Login.gov's PIV/CAC integration could be wrapped here in v3.)
 *
 * Reference: https://developers.login.gov/oidc/
 */
export default class LoginGovProvider extends BaseESignatureProvider {
  readonly name = 'login_gov';
  readonly displayName = 'Login.gov';
  readonly supportedCountries: readonly CountryCode[] = ['US'];
  readonly capabilities: readonly ProviderCapability[] = ['login'];
  readonly defaultLoA: LoA = 'substantial';
  readonly identifierLabel = 'Login.gov account';
  readonly identifierPlaceholder = undefined;

  isConfigured(): boolean {
    return Boolean(env.LOGIN_GOV_CLIENT_ID && env.LOGIN_GOV_REDIRECT_URI);
  }

  validateIdentifier(identifier: string): { ok: boolean; normalized?: string; error?: string } {
    // Login.gov uses an interactive flow — any non-empty placeholder is fine.
    return identifier.trim().length > 0
      ? { ok: true, normalized: identifier.trim() }
      : { ok: false, error: 'Identifier required' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initiateLogin(_input: InitiateLoginInput): Promise<InitiateLoginOutput> {
    // Hand off to auth_sso OIDC flow. The route layer should detect this
    // provider and redirect instead of polling.
    return Promise.reject(new Error(
      `${E_SIGNATURE_MESSAGES.PROVIDER_CAPABILITY_MISSING}: ` +
      'Login.gov uses an OIDC redirect flow. Bridge via /api/auth/sso/login_gov on the root tenant.',
    ));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pollLoginResult(_providerTxnId: string, _credentials?: ProviderCredentials): Promise<PollResult> {
    return Promise.reject(new Error('Login.gov does not support poll-style login flows'));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extractClaims(_certificate: Buffer): RawIdentityClaims {
    throw new Error('Login.gov claims come from OIDC, not from a signing certificate');
  }
}
