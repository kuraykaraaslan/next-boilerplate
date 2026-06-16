import { env } from '@nb/env';
import BaseESignatureProvider, {
  InitiateLoginInput,
  InitiateLoginOutput,
  ProviderCredentials,
} from '@nb/e_signature/server/providers/base.provider';
import type { CountryCode, PollResult, RawIdentityClaims } from '@nb/e_signature/server/e_signature.types';
import type { LoA, ProviderCapability } from '@nb/e_signature/server/e_signature.enums';
import { E_SIGNATURE_MESSAGES } from '@nb/e_signature/server/e_signature.messages';
import ESignatureCryptoService from '@nb/e_signature/server/e_signature.crypto.service';

/**
 * Swedish BankID provider — adapter shell.
 *
 * BankID's RP API uses mTLS with a client certificate issued by Finansiell ID
 * Teknik BID AB. The real HTTP integration (`/auth`, `/collect`, `/cancel`)
 * needs a TLS-aware axios instance built from `SE_BANKID_CLIENT_CERT_PATH`
 * and `SE_BANKID_CLIENT_KEY_PATH`. We surface the provider here so it shows
 * up in the system-admin overview and the user-facing picker once
 * configuration is present; calling `initiateLogin` without configuration
 * surfaces a clear "not configured" error.
 *
 * Reference: https://www.bankid.com/en/utvecklare/guider
 */
export default class BankIdSeProvider extends BaseESignatureProvider {
  readonly name = 'bankid_se';
  readonly displayName = 'BankID (Sweden)';
  readonly supportedCountries: readonly CountryCode[] = ['SE'];
  readonly capabilities: readonly ProviderCapability[] = ['login', 'sign_xades'];
  readonly defaultLoA: LoA = 'high';
  readonly identifierLabel = 'Personnummer';
  readonly identifierPlaceholder = 'YYYYMMDD-XXXX';

  isConfigured(): boolean {
    return Boolean(
      env.BANKID_SE_BASE_URL &&
      env.BANKID_SE_CLIENT_CERT_PATH &&
      env.BANKID_SE_CLIENT_KEY_PATH,
    );
  }

  validateIdentifier(identifier: string): { ok: boolean; normalized?: string; error?: string } {
    const trimmed = identifier.trim().replace('-', '');
    return /^\d{12}$/.test(trimmed)
      ? { ok: true, normalized: trimmed }
      : { ok: false, error: E_SIGNATURE_MESSAGES.IDENTIFIER_INVALID };
  }

  initiateLogin(input: InitiateLoginInput): Promise<InitiateLoginOutput> {
    if (!this.isConfigured()) {
      return Promise.reject(new Error(E_SIGNATURE_MESSAGES.PROVIDER_NOT_CONFIGURED));
    }
    // A tenant may point at its own BankID RP endpoint; honor the per-tenant
    // base URL when present, falling back to the system-level endpoint. The
    // mTLS client cert/key remain system-level (file paths in env).
    const baseUrl = input.credentials?.baseUrl ?? env.BANKID_SE_BASE_URL;
    // TODO: POST `${baseUrl}/auth` with personalNumber + requirement.certificatePolicies
    // and return { providerTxnId: orderRef, displayCode: autoStartToken? }.
    return Promise.reject(new Error(`${E_SIGNATURE_MESSAGES.NOT_IMPLEMENTED}: BankID Sweden /auth flow (${baseUrl})`));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pollLoginResult(_providerTxnId: string, _credentials?: ProviderCredentials): Promise<PollResult> {
    return Promise.reject(new Error(`${E_SIGNATURE_MESSAGES.NOT_IMPLEMENTED}: BankID Sweden /collect flow`));
  }

  extractClaims(certificate: Buffer): RawIdentityClaims {
    return ESignatureCryptoService.parseCertificate(certificate);
  }
}
