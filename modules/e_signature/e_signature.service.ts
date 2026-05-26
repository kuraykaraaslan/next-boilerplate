import { randomBytes, randomUUID } from 'node:crypto';
import 'reflect-metadata';
import { env } from '@/modules/env';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { getDataSource } from '@/modules/db';
import { User as UserEntity } from '@/modules/user/entities/user.entity';

import BaseESignatureProvider, { ProviderCredentials } from './providers/base.provider';
import MobilImzaAggregatorProvider from './providers/mobil_imza_aggregator.provider';
import SmartIdProvider from './providers/smart_id.provider';
import BankIdSeProvider from './providers/bankid_se.provider';
import LoginGovProvider from './providers/login_gov.provider';
import ESignatureCryptoService from './e_signature.crypto.service';
import ESignatureCertService from './e_signature.cert.service';
import ESignatureTrustListService from './e_signature.trust_list.service';
import ESignatureIdentityService from './e_signature.identity.service';
import ESignatureSettingsService from './e_signature.settings.service';

import {
  CHALLENGE_DISPLAY_MAX_LENGTH,
  CHALLENGE_TTL_SECONDS,
  TRANSACTION_REDIS_PREFIX,
} from './e_signature.constants';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type {
  CountryCode,
  CountryHint,
  TransactionRecord,
  VerifiedIdentity,
} from './e_signature.types';
import type { LoA } from './e_signature.enums';

export type InitiateLoginPurpose = 'login' | 'bind' | 'sign';

export interface InitiateLoginParams {
  country: CountryCode;
  identifier: string;
  providerOverride?: string;
  ip: string | null;
  ua: string | null;
  purpose: InitiateLoginPurpose;
  initiatingUserId?: string | null;
  /** When set, per-tenant aggregator credentials override the system ones. */
  tenantId?: string | null;
}

export interface InitiateLoginResult {
  transactionId: string;
  expiresIn: number;
  displayCode?: string;
  providerName: string;
}

export type LoginStatusResult =
  | { status: 'pending' | 'user_prompted' }
  | { status: 'expired' | 'failed'; failureReason?: string }
  | {
      status: 'signed';
      identity: VerifiedIdentity;
      certificate: Buffer;
      transactionRecord: TransactionRecord;
      matchedUserId: string | null;       // null ⇒ NEEDS_BINDING
      boundSigningCertificateId: string | null;
    };

export default class ESignatureService {
  // ── Provider registry (capability-flagged, country-aware) ─────────────────
  // Every provider is registered up-front. Whether each one actually surfaces
  // to end users is determined per-call by `isConfigured()`, so unconfigured
  // adapters never appear on the login picker but remain visible in the
  // admin overview at /admin/settings → E-Signature on the root tenant.
  private static readonly mobilImzaProvider = new MobilImzaAggregatorProvider();
  private static readonly smartIdProvider = new SmartIdProvider();
  private static readonly bankIdSeProvider = new BankIdSeProvider();
  private static readonly loginGovProvider = new LoginGovProvider();

  private static readonly PROVIDERS = new Map<string, BaseESignatureProvider>([
    ['mobil_imza_aggregator', ESignatureService.mobilImzaProvider],
    ['smart_id', ESignatureService.smartIdProvider],
    ['bankid_se', ESignatureService.bankIdSeProvider],
    ['login_gov', ESignatureService.loginGovProvider],
  ]);

  private static readonly DEFAULT_PROVIDER_NAME: string =
    env.EID_DEFAULT_PROVIDER || 'mobil_imza_aggregator';

  private static readonly COUNTRY_MAP: Map<string, string> = ESignatureService.buildCountryMap();

  private static buildCountryMap(): Map<string, string> {
    const map = new Map<string, string>();
    const raw = env.EID_PROVIDER_MAP;
    if (raw) {
      for (const pair of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
        const [country, providerName] = pair.split(':').map((s) => s.trim());
        if (country && providerName && ESignatureService.PROVIDERS.has(providerName)) {
          map.set(country.toUpperCase(), providerName);
        }
      }
    } else {
      // Reasonable defaults so the picker shows whatever the operator wired
      // up. Each entry only takes effect if the provider also reports
      // `isConfigured() === true`.
      map.set('TR', 'mobil_imza_aggregator');
      map.set('EE', 'smart_id');
      map.set('LV', 'smart_id');
      map.set('LT', 'smart_id');
      map.set('SE', 'bankid_se');
      map.set('US', 'login_gov');
    }
    return map;
  }

  static resolveProvider({
    country,
    providerOverride,
  }: {
    country?: CountryCode;
    providerOverride?: string;
  }): BaseESignatureProvider {
    const name =
      providerOverride
      ?? (country ? ESignatureService.COUNTRY_MAP.get(country) : undefined)
      ?? ESignatureService.DEFAULT_PROVIDER_NAME;
    const provider = ESignatureService.PROVIDERS.get(name);
    if (!provider) {
      throw new Error(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country ?? '-'}`);
    }
    if (country && provider.supportedCountries.length && !provider.supportedCountries.includes(country)) {
      throw new Error(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country}`);
    }
    return provider;
  }

  /**
   * Country hints for the user-facing login picker. Returns only providers
   * that report `isConfigured() === true` so unfinished adapters do not leak
   * into the public picker.
   *
   * Pass `{ includeUnconfigured: true }` for the admin overview that needs to
   * see every registered provider regardless of configuration state.
   */
  static listCountryHints({ includeUnconfigured = false }: { includeUnconfigured?: boolean } = {}): CountryHint[] {
    const grouped = new Map<string, CountryHint['providers']>();
    for (const provider of ESignatureService.PROVIDERS.values()) {
      if (!includeUnconfigured && !provider.isConfigured()) continue;
      for (const country of provider.supportedCountries) {
        if (!grouped.has(country)) grouped.set(country, []);
        grouped.get(country)!.push({
          id: provider.name,
          name: provider.displayName,
          identifierLabel: provider.identifierLabel,
          identifierPlaceholder: provider.identifierPlaceholder,
          capabilities: [...provider.capabilities],
          loa: provider.defaultLoA,
        });
      }
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, providers]) => ({ country: country as CountryCode, providers }));
  }

  /** Snapshot of every registered provider with its current configuration state. Admin-only. */
  static listProvidersAdmin(): Array<{
    id: string;
    displayName: string;
    countries: readonly CountryCode[];
    capabilities: readonly string[];
    loa: string;
    configured: boolean;
  }> {
    return Array.from(ESignatureService.PROVIDERS.values()).map((p) => ({
      id: p.name,
      displayName: p.displayName,
      countries: p.supportedCountries,
      capabilities: p.capabilities,
      loa: p.defaultLoA,
      configured: p.isConfigured(),
    }));
  }

  // ── Challenge / transaction helpers ───────────────────────────────────────
  private static generateChallenge(): string {
    const appName = (env.APPLICATION_NAME || 'App').slice(0, 16);
    const nonce = randomBytes(6).toString('base64url');
    const text = `${appName}: ${nonce}`;
    return text.length > CHALLENGE_DISPLAY_MAX_LENGTH
      ? text.slice(0, CHALLENGE_DISPLAY_MAX_LENGTH)
      : text;
  }

  private static txnKey(transactionId: string): string {
    return `${TRANSACTION_REDIS_PREFIX}${transactionId}`;
  }

  private static async loadTransaction(transactionId: string): Promise<TransactionRecord | null> {
    const raw = await redis.get(ESignatureService.txnKey(transactionId)).catch(() => null);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TransactionRecord;
    } catch {
      await redis.del(ESignatureService.txnKey(transactionId)).catch(() => {});
      return null;
    }
  }

  private static async saveTransaction(record: TransactionRecord, ttlSeconds: number): Promise<void> {
    await redis.set(
      ESignatureService.txnKey(record.transactionId),
      JSON.stringify(record),
      'EX',
      ttlSeconds,
    );
  }

  private static async deleteTransaction(transactionId: string): Promise<void> {
    await redis.del(ESignatureService.txnKey(transactionId)).catch(() => {});
  }

  // ── Initiate ──────────────────────────────────────────────────────────────
  static async initiateLogin(params: InitiateLoginParams): Promise<InitiateLoginResult> {
    const provider = ESignatureService.resolveProvider({
      country: params.country,
      providerOverride: params.providerOverride,
    });

    const validation = provider.validateIdentifier(params.identifier, params.country);
    if (!validation.ok) {
      throw new Error(validation.error || E_SIGNATURE_MESSAGES.IDENTIFIER_INVALID);
    }
    const normalizedIdentifier = validation.normalized ?? params.identifier;

    if (!provider.hasCapability('login')) {
      throw new Error(E_SIGNATURE_MESSAGES.PROVIDER_CAPABILITY_MISSING);
    }

    const challenge = ESignatureService.generateChallenge();
    const transactionId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const credentials = params.tenantId
      ? await ESignatureService.resolveTenantCredentials(provider.name, params.tenantId)
      : undefined;

    const providerResult = await provider.initiateLogin({
      identifier: normalizedIdentifier,
      challenge,
      credentials,
    });

    const record: TransactionRecord = {
      transactionId,
      providerName: provider.name,
      providerTxnId: providerResult.providerTxnId,
      country: params.country,
      identifier: normalizedIdentifier,
      challenge,
      ip: params.ip,
      ua: params.ua,
      status: 'pending',
      purpose: params.purpose,
      initiatingUserId: params.initiatingUserId ?? null,
      tenantId: params.tenantId ?? null,
      createdAt: now,
      expiresAt: now + CHALLENGE_TTL_SECONDS,
    };
    await ESignatureService.saveTransaction(record, CHALLENGE_TTL_SECONDS);

    return {
      transactionId,
      expiresIn: CHALLENGE_TTL_SECONDS,
      displayCode: providerResult.displayCode,
      providerName: provider.name,
    };
  }

  /**
   * Resolve aggregator credentials for a tenant, falling back to system-level
   * config field by field. Only `mobil_imza_aggregator` is wired today; other
   * providers can add their own resolver here when they accept overrides.
   */
  private static async resolveTenantCredentials(
    providerName: string,
    tenantId: string,
  ): Promise<ProviderCredentials | undefined> {
    if (providerName !== 'mobil_imza_aggregator') return undefined;
    const [apiKey, customerCode] = await Promise.all([
      ESignatureSettingsService.getTenantInternal(tenantId, 'mobilImzaAggregatorApiKey'),
      ESignatureSettingsService.getTenantInternal(tenantId, 'mobilImzaAggregatorCustomerCode'),
    ]);
    if (!apiKey && !customerCode) return undefined;
    return {
      apiKey: apiKey ?? undefined,
      customerCode: customerCode ?? undefined,
    };
  }

  // ── Poll ──────────────────────────────────────────────────────────────────
  /**
   * Poll the provider for a transaction's result. On `signed`, this method:
   *   - verifies the signature against the server-issued challenge,
   *   - validates the certificate chain and key usage,
   *   - checks LoA against the configured `EID_REQUIRED_LOA`,
   *   - normalizes claims to OIDC4IDA shape,
   *   - looks up an existing bound user (or returns NEEDS_BINDING),
   *   - deletes the Redis record (single-use).
   *
   * Session minting is NOT done here — the route layer owns cookie/session
   * concerns. See `verifyAndMintSession` in the route handler.
   */
  static async pollStatus({
    transactionId,
    ip,
    ua,
  }: {
    transactionId: string;
    ip: string | null;
    ua: string | null;
  }): Promise<LoginStatusResult> {
    const record = await ESignatureService.loadTransaction(transactionId);
    if (!record) {
      return { status: 'expired', failureReason: E_SIGNATURE_MESSAGES.TRANSACTION_NOT_FOUND };
    }
    // Scope check — initiating client IP+UA must match
    if ((record.ip && ip && record.ip !== ip) || (record.ua && ua && record.ua !== ua)) {
      Logger.warn(`e_signature txn ${transactionId} scope mismatch — possible session fixation`);
      throw new Error(E_SIGNATURE_MESSAGES.TRANSACTION_SCOPE_MISMATCH);
    }
    if (record.expiresAt * 1000 < Date.now()) {
      await ESignatureService.deleteTransaction(transactionId);
      return { status: 'expired', failureReason: E_SIGNATURE_MESSAGES.TRANSACTION_EXPIRED };
    }

    const provider = ESignatureService.PROVIDERS.get(record.providerName);
    if (!provider) {
      await ESignatureService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: E_SIGNATURE_MESSAGES.PROVIDER_NOT_FOUND };
    }

    const credentials = record.tenantId
      ? await ESignatureService.resolveTenantCredentials(provider.name, record.tenantId)
      : undefined;
    const poll = await provider.pollLoginResult(record.providerTxnId, credentials);
    if (poll.status === 'pending') return { status: 'pending' };
    if (poll.status === 'expired') {
      await ESignatureService.deleteTransaction(transactionId);
      return { status: 'expired', failureReason: poll.failureReason };
    }
    if (poll.status === 'failed' || !poll.signature || !poll.certificate) {
      await ESignatureService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: poll.failureReason };
    }

    // SIGNED — verify everything before declaring success
    const sigOk = ESignatureCryptoService.verifyChallengeSignature({
      challenge: record.challenge,
      signature: poll.signature,
      certificate: poll.certificate,
    });
    if (!sigOk) {
      await ESignatureService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: 'signature_invalid' };
    }

    // Certificate policy: validity, key usage
    try {
      ESignatureCryptoService.assertValidityWindow(poll.certificate);
      ESignatureCryptoService.assertKeyUsageForSignature(poll.certificate);
    } catch (err) {
      await ESignatureService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: err instanceof Error ? err.message : 'certificate_invalid' };
    }

    // Chain validation (trust list lookup by issuer country)
    let leafIssuerDer: Buffer | undefined;
    const trustRoots = await ESignatureTrustListService.getTrustRootsForCountry(record.country);
    if (trustRoots.length > 0) {
      try {
        const { ok: chainOk, leafIssuerDer: issuerDer } = await ESignatureCryptoService.validateChain({
          leaf: poll.certificate,
          intermediates: [],
          trustRootsPem: trustRoots,
        });
        leafIssuerDer = issuerDer;
        if (!chainOk) {
          await ESignatureService.deleteTransaction(transactionId);
          return { status: 'failed', failureReason: 'certificate_chain_invalid' };
        }
      } catch (err) {
        await ESignatureService.deleteTransaction(transactionId);
        return { status: 'failed', failureReason: err instanceof Error ? err.message : 'certificate_chain_invalid' };
      }
    } else {
      Logger.warn(`no trust roots configured for country ${record.country} — chain validation skipped`);
    }

    // Revocation (soft-fail on unknown, fail closed on revoked).
    // We must supply the discovered issuer cert for the OCSP CertID build;
    // skip the check entirely if chain validation didn't yield one.
    if (leafIssuerDer) {
      const ocsp = await ESignatureCryptoService
        .checkRevocationOCSP(poll.certificate, leafIssuerDer)
        .catch(() => ({ status: 'unknown' as const }));
      if (ocsp.status === 'revoked') {
        await ESignatureService.deleteTransaction(transactionId);
        return { status: 'failed', failureReason: 'certificate_revoked' };
      }
    }

    // Claims + LoA policy
    const rawClaims = provider.extractClaims(poll.certificate, poll.providerClaims);
    const requiredLoA: LoA | null = (env.EID_REQUIRED_LOA as LoA | undefined) ?? null;
    const loa = provider.defaultLoA;
    if (requiredLoA && ESignatureService.loaRank(loa) < ESignatureService.loaRank(requiredLoA)) {
      await ESignatureService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: E_SIGNATURE_MESSAGES.LOA_INSUFFICIENT };
    }

    const identity = ESignatureIdentityService.normalize({
      raw: rawClaims,
      providerName: provider.name,
      country: record.country,
      loa,
    });

    // User matching
    const bound = await ESignatureCertService.findByFingerprint(rawClaims.certFingerprintSha256);
    let matchedUserId: string | null = bound?.userId ?? null;
    let boundSigningCertificateId: string | null = bound?.signingCertificateId ?? null;

    if (!matchedUserId && record.purpose === 'login') {
      // Country-specific fallback lookups. TR: match on phone + national-id-hash if any.
      matchedUserId = await ESignatureService.findUserByCountryFallback({
        country: record.country,
        identifier: record.identifier,
        nationalIdHash: identity.national_id?.value_hash ?? null,
      });
    }

    // Auto-bind during a `bind` purpose (route layer already verified OTP)
    if (record.purpose === 'bind' && record.initiatingUserId) {
      const newBound = await ESignatureCertService.bind({
        userId: record.initiatingUserId,
        providerName: provider.name,
        country: record.country,
        claims: rawClaims,
        loa,
        subjectDN: rawClaims.commonName ? `CN=${rawClaims.commonName}` : `serial=${rawClaims.certSerialHex}`,
      });
      matchedUserId = record.initiatingUserId;
      boundSigningCertificateId = newBound.signingCertificateId;
    }

    if (boundSigningCertificateId) {
      await ESignatureCertService.markUsed(boundSigningCertificateId).catch(() => {});
    }

    // Single-use: drop the Redis record
    await ESignatureService.deleteTransaction(transactionId);

    return {
      status: 'signed',
      identity,
      certificate: poll.certificate,
      transactionRecord: record,
      matchedUserId,
      boundSigningCertificateId,
    };
  }

  private static loaRank(loa: LoA): number {
    return { low: 1, substantial: 2, high: 3 }[loa];
  }

  private static async findUserByCountryFallback({
    country,
    identifier,
    nationalIdHash,
  }: {
    country: CountryCode;
    identifier: string;
    nationalIdHash: string | null;
  }): Promise<string | null> {
    const ds = await getDataSource();
    const repo = ds.getRepository(UserEntity);

    // Identifier-based lookup (TR: phone). For other countries this would
    // query a verified-personal-code table once those providers are wired.
    if (country === 'TR') {
      const byPhone = await repo.findOne({ where: { phone: identifier } });
      if (byPhone) {
        // If we also know the cert's national id hash, refuse to match when
        // the user has one bound that doesn't agree. Until users carry a
        // hashed national id on the record itself, we accept by phone alone.
        return byPhone.userId;
      }
    }

    // National-id-based lookup would join against a per-user identifier
    // table that doesn't exist yet — leave as a hook for v1.1.
    void nationalIdHash;
    return null;
  }

  // ── Public surface for routes ─────────────────────────────────────────────
  static getProviderByName(name: string): BaseESignatureProvider | undefined {
    return ESignatureService.PROVIDERS.get(name);
  }

  static listProviders(): string[] {
    return Array.from(ESignatureService.PROVIDERS.keys());
  }
}
