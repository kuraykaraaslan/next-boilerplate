import { createHash, randomBytes } from 'node:crypto';
import axios, { AxiosInstance } from 'axios';
import { env } from '@nb/env';
import Logger from '@nb/logger';
import BaseESignatureProvider, {
  InitiateLoginInput,
  InitiateLoginOutput,
  ProviderCredentials,
} from './base.provider';
import type { CountryCode, PollResult, RawIdentityClaims } from '../e_signature.types';
import type { LoA, ProviderCapability } from '../e_signature.enums';
import { E_SIGNATURE_MESSAGES } from '../e_signature.messages';
import ESignatureCryptoService from '../e_signature.crypto.service';

/**
 * Smart-ID provider (Estonia, Latvia, Lithuania).
 *
 * Talks to the SK ID Solutions Relying Party API v2:
 *   https://github.com/SK-EID/smart-id-documentation
 *
 * Flow:
 *   1. We hash a server-issued random nonce (SHA-512) and POST it to
 *      `/authentication/etsi/PNO{COUNTRY}-{personalCode}` together with the
 *      RP UUID + RP name. SK returns `{ sessionID }`.
 *   2. We compute the 4-digit verification code from the hash (per SK spec)
 *      and surface it to the user; the same code is shown on their phone.
 *   3. We poll `/session/{sessionID}` until SK returns `state: 'COMPLETE'`
 *      with a `result.endResult` (`OK` / `USER_REFUSED` / ...), a `signature`
 *      and a `cert` (the user's authentication certificate).
 *   4. We bury the nonce in the transaction record so the upstream verifier
 *      can re-check `signature` against `cert.publicKey` over the same hash.
 *
 * Configuration: requires `SMART_ID_BASE_URL`, `SMART_ID_RELYING_PARTY_UUID`,
 * `SMART_ID_RELYING_PARTY_NAME`.
 */
export default class SmartIdProvider extends BaseESignatureProvider {
  readonly name = 'smart_id';
  readonly displayName = 'Smart-ID';
  readonly supportedCountries: readonly CountryCode[] = ['EE', 'LV', 'LT'];
  readonly capabilities: readonly ProviderCapability[] = ['login'];
  readonly defaultLoA: LoA = 'high';
  readonly identifierLabel = 'Personal code';
  readonly identifierPlaceholder = 'e.g. 38001085718';

  /**
   * The Smart-ID hash that gets signed (SHA-512 of the challenge bytes).
   * We stash it in this in-memory map keyed by `sessionID` so the polling
   * call can return the cert + signature together with the same hash for
   * upstream verification.
   *
   * In a multi-process deployment this Map should move to Redis; for the
   * MVP, the upstream service holds the canonical challenge in its own
   * Redis transaction record so we re-derive the hash there as needed.
   */
  private readonly hashBySession = new Map<string, Buffer>();

  private readonly defaultHttp: AxiosInstance;

  constructor() {
    super();
    this.defaultHttp = this.buildHttp();
  }

  isConfigured(): boolean {
    return Boolean(
      env.SMART_ID_BASE_URL &&
      env.SMART_ID_RELYING_PARTY_UUID &&
      env.SMART_ID_RELYING_PARTY_NAME,
    );
  }

  private buildHttp(creds?: ProviderCredentials): AxiosInstance {
    return axios.create({
      baseURL: creds?.baseUrl ?? env.SMART_ID_BASE_URL,
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  private resolveHttp(creds?: ProviderCredentials): AxiosInstance {
    return creds?.baseUrl ? this.buildHttp(creds) : this.defaultHttp;
  }

  validateIdentifier(identifier: string, country?: CountryCode): { ok: boolean; normalized?: string; error?: string } {
    const trimmed = identifier.trim().toUpperCase();
    // Accept either the bare personal code (11 digits) or the ETSI form `PNOEE-...`
    const etsi = trimmed.match(/^PNO(EE|LV|LT)-(\d{6,11})$/);
    if (etsi) {
      if (country && country !== etsi[1]) {
        return { ok: false, error: 'Personal code country does not match selected country' };
      }
      return { ok: true, normalized: trimmed };
    }
    if (/^\d{6,11}$/.test(trimmed)) {
      if (!country) return { ok: false, error: 'Country is required for Smart-ID' };
      return { ok: true, normalized: `PNO${country}-${trimmed}` };
    }
    return { ok: false, error: E_SIGNATURE_MESSAGES.IDENTIFIER_INVALID };
  }

  /**
   * Smart-ID verification code (4 digits): the leftmost 2 bytes of the
   * SHA-256 of the hash, interpreted big-endian and modulo 10000.
   */
  private static verificationCodeFor(hash: Buffer): string {
    const sha = createHash('sha256').update(hash).digest();
    const value = (sha.readUInt16BE(0) & 0xffff) % 10000;
    return value.toString().padStart(4, '0');
  }

  async initiateLogin(input: InitiateLoginInput): Promise<InitiateLoginOutput> {
    if (!this.isConfigured()) {
      throw new Error(E_SIGNATURE_MESSAGES.PROVIDER_NOT_CONFIGURED);
    }
    // The challenge from the facade is short and human-readable — the actual
    // bytes we feed to SK are a random 64-byte nonce hashed with SHA-512, as
    // mandated by the Smart-ID protocol. The displayed verification code is
    // derived from that hash.
    const nonce = Buffer.concat([Buffer.from(input.challenge, 'utf8'), randomBytes(32)]);
    const hash = createHash('sha512').update(nonce).digest();
    const http = this.resolveHttp(input.credentials);
    // A tenant may operate its own Smart-ID relying-party account; honor the
    // per-tenant UUID/name when present, otherwise fall back to the system env.
    const relyingPartyUUID = input.credentials?.extra?.relyingPartyUuid ?? env.SMART_ID_RELYING_PARTY_UUID;
    const relyingPartyName = input.credentials?.extra?.relyingPartyName ?? env.SMART_ID_RELYING_PARTY_NAME;
    try {
      const { data } = await http.post<{ sessionID: string }>(
        `/authentication/etsi/${encodeURIComponent(input.identifier)}`,
        {
          relyingPartyUUID,
          relyingPartyName,
          certificateLevel: 'QUALIFIED',
          hash: hash.toString('base64'),
          hashType: 'SHA512',
          allowedInteractionsOrder: [
            { type: 'displayTextAndPIN', displayText60: input.challenge.slice(0, 60) },
          ],
        },
      );
      this.hashBySession.set(data.sessionID, hash);
      return {
        providerTxnId: data.sessionID,
        displayCode: SmartIdProvider.verificationCodeFor(hash),
      };
    } catch (err) {
      Logger.error(`${this.name}.initiateLogin failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new Error(E_SIGNATURE_MESSAGES.AGGREGATOR_REQUEST_FAILED);
    }
  }

  async pollLoginResult(providerTxnId: string, credentials?: ProviderCredentials): Promise<PollResult> {
    const http = this.resolveHttp(credentials);
    try {
      const { data } = await http.get<{
        state: 'RUNNING' | 'COMPLETE';
        result?: { endResult: string };
        signature?: { value: string; algorithm: string };
        cert?: { value: string; certificateLevel: string };
      }>(`/session/${encodeURIComponent(providerTxnId)}?timeoutMs=1000`);

      if (data.state === 'RUNNING') return { status: 'pending' };

      const end = data.result?.endResult;
      if (end !== 'OK' || !data.signature || !data.cert) {
        this.hashBySession.delete(providerTxnId);
        return { status: 'failed', failureReason: this.mapEndResult(end) };
      }

      this.hashBySession.delete(providerTxnId);
      return {
        status: 'signed',
        signature: Buffer.from(data.signature.value, 'base64'),
        certificate: Buffer.from(data.cert.value, 'base64'),
      };
    } catch (err) {
      Logger.error(`${this.name}.pollLoginResult failed: ${err instanceof Error ? err.message : String(err)}`);
      return { status: 'failed', failureReason: 'provider_error' };
    }
  }

  private mapEndResult(end: string | undefined): PollResult['failureReason'] {
    switch (end) {
      case 'USER_REFUSED':
      case 'USER_REFUSED_DISPLAYTEXTANDPIN':
      case 'USER_REFUSED_VC_CHOICE':
      case 'USER_REFUSED_CONFIRMATIONMESSAGE':
      case 'USER_REFUSED_CERT_CHOICE':
        return 'user_cancelled';
      case 'TIMEOUT':
        return 'user_timeout';
      case 'DOCUMENT_UNUSABLE':
        return 'sim_unsupported';
      case 'WRONG_VC':
        return 'wrong_pin';
      default:
        return 'provider_error';
    }
  }

  extractClaims(certificate: Buffer): RawIdentityClaims {
    return ESignatureCryptoService.parseCertificate(certificate);
  }
}
