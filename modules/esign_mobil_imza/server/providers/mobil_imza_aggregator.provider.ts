import axios, { AxiosInstance } from 'axios';
import { env } from '@nb/env';
import Logger from '@nb/logger';
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
 * Turkish Mobile Signature aggregator provider.
 *
 * Aggregators (e.g. E-Guven MobilSign, TURKKEP) expose a single API that
 * routes signing transactions to the user's GSM operator (Turkcell, Vodafone
 * Turkey, Turk Telekom). This adapter targets that aggregator-level API.
 *
 * Concrete request/response shapes vary between aggregators; this class
 * encapsulates the boundary so the rest of the system stays vendor-neutral.
 * Swap the HTTP calls in `initiateLogin`/`pollLoginResult` to match your
 * chosen aggregator's contract.
 */
export default class MobilImzaAggregatorProvider extends BaseESignatureProvider {
  readonly name = 'mobil_imza_aggregator';
  readonly displayName = 'Mobil İmza';  // Turkish product name — kept as-is
  readonly supportedCountries: readonly CountryCode[] = ['TR'];
  readonly capabilities: readonly ProviderCapability[] = ['login'];
  readonly defaultLoA: LoA = 'high';
  readonly identifierLabel = 'Mobile number (Turkey)';
  readonly identifierPlaceholder = '+90 5XX XXX XX XX';

  private readonly defaultHttp: AxiosInstance;

  constructor() {
    super();
    this.defaultHttp = this.buildHttp();
  }

  /**
   * Build an axios instance for a single call. When `creds` is supplied
   * (typically from tenant_setting) it overrides the env-level defaults —
   * lets each tenant carry its own aggregator account.
   */
  private buildHttp(creds?: ProviderCredentials): AxiosInstance {
    const baseURL = creds?.baseUrl ?? env.MOBIL_IMZA_AGGREGATOR_BASE_URL;
    const apiKey = creds?.apiKey ?? env.MOBIL_IMZA_AGGREGATOR_API_KEY;
    const customerCode = creds?.customerCode ?? env.MOBIL_IMZA_AGGREGATOR_CUSTOMER_CODE;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    if (customerCode) headers['X-Customer-Code'] = customerCode;
    return axios.create({ baseURL, timeout: 15_000, headers });
  }

  private resolveHttp(creds?: ProviderCredentials): AxiosInstance {
    return creds && (creds.baseUrl || creds.apiKey || creds.customerCode)
      ? this.buildHttp(creds)
      : this.defaultHttp;
  }

  isConfigured(): boolean {
    return Boolean(env.MOBIL_IMZA_AGGREGATOR_BASE_URL && env.MOBIL_IMZA_AGGREGATOR_API_KEY);
  }

  validateIdentifier(identifier: string): { ok: boolean; normalized?: string; error?: string } {
    const trimmed = identifier.trim().replace(/\s|-/g, '');
    // E.164 for Türkiye: +90 followed by 10 digits, mobile prefix 5XX
    const re = /^\+905\d{9}$/;
    if (!re.test(trimmed)) {
      return { ok: false, error: E_SIGNATURE_MESSAGES.IDENTIFIER_INVALID };
    }
    return { ok: true, normalized: trimmed };
  }

  async initiateLogin(input: InitiateLoginInput): Promise<InitiateLoginOutput> {
    const baseUrl = input.credentials?.baseUrl ?? env.MOBIL_IMZA_AGGREGATOR_BASE_URL;
    const apiKey = input.credentials?.apiKey ?? env.MOBIL_IMZA_AGGREGATOR_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error(E_SIGNATURE_MESSAGES.PROVIDER_NOT_CONFIGURED);
    }
    const http = this.resolveHttp(input.credentials);
    try {
      // Aggregator-specific contract — adjust path and payload shape per vendor.
      const { data } = await http.post<{
        transactionId: string;
        verificationCode?: string;
      }>('/signatures', {
        msisdn: input.identifier,
        message: input.challenge,
        signatureProfile: 'AUTHENTICATION',
        async: true,
      });
      return {
        providerTxnId: data.transactionId,
        displayCode: data.verificationCode,
      };
    } catch (err: unknown) {
      Logger.error(
        `${this.name}.initiateLogin failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new Error(E_SIGNATURE_MESSAGES.AGGREGATOR_REQUEST_FAILED);
    }
  }

  async pollLoginResult(providerTxnId: string, credentials?: ProviderCredentials): Promise<PollResult> {
    const http = this.resolveHttp(credentials);
    try {
      const { data } = await http.get<{
        status: 'PENDING' | 'SIGNED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
        signature?: string;          // base64
        certificate?: string;        // base64 (DER)
        failureCode?: string;
      }>(`/signatures/${encodeURIComponent(providerTxnId)}`);

      switch (data.status) {
        case 'SIGNED':
          if (!data.signature || !data.certificate) {
            return { status: 'failed', failureReason: 'provider_error' };
          }
          return {
            status: 'signed',
            signature: Buffer.from(data.signature, 'base64'),
            certificate: Buffer.from(data.certificate, 'base64'),
          };
        case 'PENDING':
          return { status: 'pending' };
        case 'EXPIRED':
          return { status: 'expired', failureReason: 'user_timeout' };
        case 'CANCELLED':
          return { status: 'failed', failureReason: 'user_cancelled' };
        case 'FAILED':
        default:
          return { status: 'failed', failureReason: this.mapFailureCode(data.failureCode) };
      }
    } catch (err: unknown) {
      Logger.error(
        `${this.name}.pollLoginResult failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { status: 'failed', failureReason: 'provider_error' };
    }
  }

  private mapFailureCode(code: string | undefined): PollResult['failureReason'] {
    switch (code) {
      case 'WRONG_PIN':
        return 'wrong_pin';
      case 'SIM_NOT_PROVISIONED':
        return 'sim_inactive';
      case 'SIM_NOT_SUPPORTED':
        return 'sim_unsupported';
      default:
        return 'provider_error';
    }
  }

  extractClaims(certificate: Buffer): RawIdentityClaims {
    // Crypto service parses the cert; provider just delegates because for
    // Mobil İmza all identity info travels via the certificate (Subject CN
    // and serialNumber that encodes the TC Kimlik No).
    return ESignatureCryptoService.parseCertificate(certificate);
  }
}
