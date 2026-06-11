import { randomBytes, randomUUID } from 'node:crypto';
import { env } from '@/modules/env';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { getDataSource } from '@/modules/db';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import WebhookService from '@/modules/webhook/webhook.service';
import ESignatureCryptoService from './e_signature.crypto.service';
import ESignatureCertService from './e_signature.cert.service';
import ESignatureTrustListService from './e_signature.trust_list.service';
import ESignatureIdentityService from './e_signature.identity.service';
import ESignatureSettingsService from './e_signature.settings.service';
import ESignatureProviderService from './e_signature.provider.service';
import { ProviderCredentials } from './providers/base.provider';
import {
  CHALLENGE_DISPLAY_MAX_LENGTH,
  CHALLENGE_TTL_SECONDS,
  TRANSACTION_REDIS_PREFIX,
} from './e_signature.constants';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type { CountryCode, TransactionRecord, VerifiedIdentity } from './e_signature.types';
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
      matchedUserId: string | null;
      boundSigningCertificateId: string | null;
    };

export default class ESignatureWorkflowService {

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

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
    const raw = await redis.get(ESignatureWorkflowService.txnKey(transactionId)).catch(() => null);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TransactionRecord;
    } catch {
      await redis.del(ESignatureWorkflowService.txnKey(transactionId)).catch(() => {});
      return null;
    }
  }

  private static async saveTransaction(record: TransactionRecord, ttlSeconds: number): Promise<void> {
    await redis.set(
      ESignatureWorkflowService.txnKey(record.transactionId),
      JSON.stringify(record),
      'EX',
      ttlSeconds,
    );
  }

  private static async deleteTransaction(transactionId: string): Promise<void> {
    await redis.del(ESignatureWorkflowService.txnKey(transactionId)).catch(() => {});
  }

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
    if (country === 'TR') {
      const byPhone = await repo.findOne({ where: { phone: identifier } });
      if (byPhone) return byPhone.userId;
    }
    void nationalIdHash;
    return null;
  }

  // ──────────────────────────────────────────────
  // Public Methods
  // ──────────────────────────────────────────────

  static async initiateLogin(params: InitiateLoginParams): Promise<InitiateLoginResult> {
    const provider = ESignatureProviderService.resolveProvider({
      country: params.country,
      providerOverride: params.providerOverride,
    });

    const validation = provider.validateIdentifier(params.identifier, params.country);
    if (!validation.ok) {
      throw new AppError(validation.error || E_SIGNATURE_MESSAGES.IDENTIFIER_INVALID, 422, ErrorCode.VALIDATION_ERROR);
    }
    const normalizedIdentifier = validation.normalized ?? params.identifier;

    if (!provider.hasCapability('login')) {
      throw new AppError(E_SIGNATURE_MESSAGES.PROVIDER_CAPABILITY_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    }

    const challenge = ESignatureWorkflowService.generateChallenge();
    const transactionId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const credentials = params.tenantId
      ? await ESignatureWorkflowService.resolveTenantCredentials(provider.name, params.tenantId)
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
    await ESignatureWorkflowService.saveTransaction(record, CHALLENGE_TTL_SECONDS);

    return {
      transactionId,
      expiresIn: CHALLENGE_TTL_SECONDS,
      displayCode: providerResult.displayCode,
      providerName: provider.name,
    };
  }

  static async pollStatus({
    transactionId,
    ip,
    ua,
  }: {
    transactionId: string;
    ip: string | null;
    ua: string | null;
  }): Promise<LoginStatusResult> {
    const record = await ESignatureWorkflowService.loadTransaction(transactionId);
    if (!record) {
      return { status: 'expired', failureReason: E_SIGNATURE_MESSAGES.TRANSACTION_NOT_FOUND };
    }
    if ((record.ip && ip && record.ip !== ip) || (record.ua && ua && record.ua !== ua)) {
      Logger.warn(`e_signature txn ${transactionId} scope mismatch — possible session fixation`);
      throw new AppError(E_SIGNATURE_MESSAGES.TRANSACTION_SCOPE_MISMATCH, 403, ErrorCode.FORBIDDEN);
    }
    if (record.expiresAt * 1000 < Date.now()) {
      await ESignatureWorkflowService.deleteTransaction(transactionId);
      return { status: 'expired', failureReason: E_SIGNATURE_MESSAGES.TRANSACTION_EXPIRED };
    }

    const provider = ESignatureProviderService.getProviderByName(record.providerName);
    if (!provider) {
      await ESignatureWorkflowService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: E_SIGNATURE_MESSAGES.PROVIDER_NOT_FOUND };
    }

    const credentials = record.tenantId
      ? await ESignatureWorkflowService.resolveTenantCredentials(provider.name, record.tenantId)
      : undefined;
    const poll = await provider.pollLoginResult(record.providerTxnId, credentials);
    if (poll.status === 'pending') return { status: 'pending' };
    if (poll.status === 'expired') {
      await ESignatureWorkflowService.deleteTransaction(transactionId);
      return { status: 'expired', failureReason: poll.failureReason };
    }
    if (poll.status === 'failed' || !poll.signature || !poll.certificate) {
      await ESignatureWorkflowService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: poll.failureReason };
    }

    const sigOk = ESignatureCryptoService.verifyChallengeSignature({
      challenge: record.challenge,
      signature: poll.signature,
      certificate: poll.certificate,
    });
    if (!sigOk) {
      await ESignatureWorkflowService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: 'signature_invalid' };
    }

    try {
      ESignatureCryptoService.assertValidityWindow(poll.certificate);
      ESignatureCryptoService.assertKeyUsageForSignature(poll.certificate);
    } catch (err) {
      await ESignatureWorkflowService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: err instanceof Error ? err.message : 'certificate_invalid' };
    }

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
          await ESignatureWorkflowService.deleteTransaction(transactionId);
          return { status: 'failed', failureReason: 'certificate_chain_invalid' };
        }
      } catch (err) {
        await ESignatureWorkflowService.deleteTransaction(transactionId);
        return { status: 'failed', failureReason: err instanceof Error ? err.message : 'certificate_chain_invalid' };
      }
    } else {
      Logger.warn(`no trust roots configured for country ${record.country} — chain validation skipped`);
    }

    if (leafIssuerDer) {
      const ocsp = await ESignatureCryptoService
        .checkRevocationOCSP(poll.certificate, leafIssuerDer)
        .catch(() => ({ status: 'unknown' as const }));
      if (ocsp.status === 'revoked') {
        await ESignatureWorkflowService.deleteTransaction(transactionId);
        return { status: 'failed', failureReason: 'certificate_revoked' };
      }
    }

    const rawClaims = provider.extractClaims(poll.certificate, poll.providerClaims);
    const requiredLoA: LoA | null = (env.EID_REQUIRED_LOA as LoA | undefined) ?? null;
    const loa = provider.defaultLoA;
    if (requiredLoA && ESignatureWorkflowService.loaRank(loa) < ESignatureWorkflowService.loaRank(requiredLoA)) {
      await ESignatureWorkflowService.deleteTransaction(transactionId);
      return { status: 'failed', failureReason: E_SIGNATURE_MESSAGES.LOA_INSUFFICIENT };
    }

    const identity = ESignatureIdentityService.normalize({
      raw: rawClaims,
      providerName: provider.name,
      country: record.country,
      loa,
    });

    const bound = await ESignatureCertService.findByFingerprint(rawClaims.certFingerprintSha256);
    let matchedUserId: string | null = bound?.userId ?? null;
    let boundSigningCertificateId: string | null = bound?.signingCertificateId ?? null;

    if (!matchedUserId && record.purpose === 'login') {
      matchedUserId = await ESignatureWorkflowService.findUserByCountryFallback({
        country: record.country,
        identifier: record.identifier,
        nationalIdHash: identity.national_id?.value_hash ?? null,
      });
    }

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

    await ESignatureWorkflowService.deleteTransaction(transactionId);

    if (record.tenantId) {
      await WebhookService.dispatchEvent(record.tenantId, 'identity.verified', {
        transactionId,
        country: record.country,
        matchedUserId: matchedUserId ?? null,
        purpose: record.purpose,
      });
      if (record.purpose === 'sign') {
        await WebhookService.dispatchEvent(record.tenantId, 'document.signed', {
          transactionId,
          country: record.country,
          matchedUserId: matchedUserId ?? null,
        });
      }
    }

    return {
      status: 'signed',
      identity,
      certificate: poll.certificate,
      transactionRecord: record,
      matchedUserId,
      boundSigningCertificateId,
    };
  }
}
