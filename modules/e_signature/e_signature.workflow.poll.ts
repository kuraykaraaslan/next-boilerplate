import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import ESignatureCryptoService from './e_signature.crypto.service';
import ESignatureCertService from './e_signature.cert.service';
import ESignatureTrustListService from './e_signature.trust_list.service';
import ESignatureIdentityService from './e_signature.identity.service';
import ESignatureProviderService from './e_signature.provider.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type { LoA } from './e_signature.enums';
import type { LoginStatusResult } from './e_signature.workflow.types';
import {
  deleteTransaction, findUserByCountryFallback, loadTransaction, loaRank, resolveTenantCredentials,
} from './e_signature.workflow.helpers';

export async function pollStatus({
  transactionId,
  ip,
  ua,
}: {
  transactionId: string;
  ip: string | null;
  ua: string | null;
}): Promise<LoginStatusResult> {
  const record = await loadTransaction(transactionId);
  if (!record) {
    return { status: 'expired', failureReason: E_SIGNATURE_MESSAGES.TRANSACTION_NOT_FOUND };
  }
  if ((record.ip && ip && record.ip !== ip) || (record.ua && ua && record.ua !== ua)) {
    Logger.warn(`e_signature txn ${transactionId} scope mismatch — possible session fixation`);
    throw new AppError(E_SIGNATURE_MESSAGES.TRANSACTION_SCOPE_MISMATCH, 403, ErrorCode.FORBIDDEN);
  }
  if (record.expiresAt * 1000 < Date.now()) {
    await deleteTransaction(transactionId);
    return { status: 'expired', failureReason: E_SIGNATURE_MESSAGES.TRANSACTION_EXPIRED };
  }

  const provider = ESignatureProviderService.getProviderByName(record.providerName);
  if (!provider) {
    await deleteTransaction(transactionId);
    return { status: 'failed', failureReason: E_SIGNATURE_MESSAGES.PROVIDER_NOT_FOUND };
  }

  const credentials = record.tenantId
    ? await resolveTenantCredentials(provider.name, record.tenantId)
    : undefined;
  const poll = await provider.pollLoginResult(record.providerTxnId, credentials);
  if (poll.status === 'pending') return { status: 'pending' };
  if (poll.status === 'expired') {
    await deleteTransaction(transactionId);
    return { status: 'expired', failureReason: poll.failureReason };
  }
  if (poll.status === 'failed' || !poll.signature || !poll.certificate) {
    await deleteTransaction(transactionId);
    return { status: 'failed', failureReason: poll.failureReason };
  }

  const sigOk = ESignatureCryptoService.verifyChallengeSignature({
    challenge: record.challenge,
    signature: poll.signature,
    certificate: poll.certificate,
  });
  if (!sigOk) {
    await deleteTransaction(transactionId);
    return { status: 'failed', failureReason: 'signature_invalid' };
  }

  try {
    ESignatureCryptoService.assertValidityWindow(poll.certificate);
    ESignatureCryptoService.assertKeyUsageForSignature(poll.certificate);
  } catch (err) {
    await deleteTransaction(transactionId);
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
        await deleteTransaction(transactionId);
        return { status: 'failed', failureReason: 'certificate_chain_invalid' };
      }
    } catch (err) {
      await deleteTransaction(transactionId);
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
      await deleteTransaction(transactionId);
      return { status: 'failed', failureReason: 'certificate_revoked' };
    }
  }

  const rawClaims = provider.extractClaims(poll.certificate, poll.providerClaims);
  const requiredLoA: LoA | null = (env.EID_REQUIRED_LOA as LoA | undefined) ?? null;
  const loa = provider.defaultLoA;
  if (requiredLoA && loaRank(loa) < loaRank(requiredLoA)) {
    await deleteTransaction(transactionId);
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
    matchedUserId = await findUserByCountryFallback({
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

  await deleteTransaction(transactionId);

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
