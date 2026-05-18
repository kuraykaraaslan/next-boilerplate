import type {
  CountryCode,
  Identifier,
  PollResult,
  RawIdentityClaims,
} from '../e_signature.types';
import type { LoA, ProviderCapability, SignatureFormat } from '../e_signature.enums';
import { E_SIGNATURE_MESSAGES } from '../e_signature.messages';

/**
 * Per-call credentials override (system → tenant scope). Providers fall back
 * to environment configuration when the override is undefined or omits a
 * field. Keep this shape vendor-neutral; provider-specific keys go inside
 * `extra` so the abstract interface doesn't grow per vendor.
 */
export interface ProviderCredentials {
  baseUrl?: string;
  apiKey?: string;
  customerCode?: string;
  extra?: Record<string, string>;
}

export interface InitiateLoginInput {
  identifier: Identifier;
  challenge: string;
  credentials?: ProviderCredentials;
}

export interface InitiateLoginOutput {
  providerTxnId: string;
  // Verification code shown in the UI so the user can compare it to what
  // appears on their phone/app (Smart-ID, BankID, mobile-signature, …).
  displayCode?: string;
}

export interface SignDocumentInput {
  documentHash: Buffer;       // SHA-256 of canonical document bytes
  documentHashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  identifier: Identifier;
  format: SignatureFormat;
  // Reason/location are optional PAdES annotations
  reason?: string;
  location?: string;
  // For PAdES B-LTA we want a TSA timestamp + revocation embedded
  withTimestamp?: boolean;
  withLTV?: boolean;
}

export interface SignDocumentOutput {
  providerTxnId: string;
  displayCode?: string;
}

export interface SignDocumentResult {
  status: 'pending' | 'signed' | 'failed' | 'expired';
  signedBytes?: Buffer;
  signature?: Buffer;
  certificate?: Buffer;
  failureReason?: string;
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export default abstract class BaseESignatureProvider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly supportedCountries: readonly CountryCode[];
  abstract readonly capabilities: readonly ProviderCapability[];
  abstract readonly defaultLoA: LoA;

  // UI hint for the country picker. Override per provider.
  abstract readonly identifierLabel: string;
  abstract readonly identifierPlaceholder?: string;

  hasCapability(capability: ProviderCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Whether this provider has enough configuration to actually run a login
   * (env vars, API keys, etc.). Adapters that aren't yet fully wired return
   * false here so the user-facing country picker only surfaces providers an
   * admin has set up. Defaults to false so a stub adapter doesn't accidentally
   * advertise itself; concrete providers must override.
   */
  isConfigured(): boolean {
    return false;
  }

  /**
   * Validate (and optionally normalize) a provider-specific identifier.
   * MUST NOT throw — return `ok:false` instead with a reason.
   */
  abstract validateIdentifier(
    identifier: string,
    country?: CountryCode,
  ): { ok: boolean; normalized?: string; error?: string };

  // ── Login (MVP) ─────────────────────────────────────────────────────────
  abstract initiateLogin(input: InitiateLoginInput): Promise<InitiateLoginOutput>;
  abstract pollLoginResult(providerTxnId: string, credentials?: ProviderCredentials): Promise<PollResult>;

  // ── Document signing (v2 — stubs throw NotImplementedError) ────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initiateDocumentSign(_input: SignDocumentInput): Promise<SignDocumentOutput> {
    return Promise.reject(
      new NotImplementedError(`${E_SIGNATURE_MESSAGES.NOT_IMPLEMENTED}: ${this.name}.initiateDocumentSign`),
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pollDocumentSignResult(_providerTxnId: string): Promise<SignDocumentResult> {
    return Promise.reject(
      new NotImplementedError(`${E_SIGNATURE_MESSAGES.NOT_IMPLEMENTED}: ${this.name}.pollDocumentSignResult`),
    );
  }

  /**
   * Extract raw identity claims from a successfully verified certificate
   * (and any provider-supplied side claims). Used by the identity service
   * to produce a normalized OIDC4IDA verified_claims object.
   */
  abstract extractClaims(certificate: Buffer, providerClaims?: unknown): RawIdentityClaims;
}
