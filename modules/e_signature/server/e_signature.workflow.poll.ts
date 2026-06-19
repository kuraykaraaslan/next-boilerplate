import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import ESignatureCryptoService from './e_signature.crypto.service';
import ESignatureTrustListService from './e_signature.trust_list.service';
import ESignatureIdentityService from './e_signature.identity.service';
import ESignatureProviderService from './e_signature.provider.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type { LoA } from './e_signature.enums';
import type { LoginStatusResult } from './e_signature.workflow.types';
import {
  deleteTransaction, loadTransaction, loaRank,
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

  const provider = await ESignatureProviderService.getProviderByName(record.providerName, record.tenantId ?? undefined);
  if (!provider) {
    await deleteTransaction(transactionId);
    return { status: 'failed', failureReason: E_SIGNATURE_MESSAGES.PROVIDER_NOT_FOUND };
  }

  const poll = await provider.pollLoginResult(record.providerTxnId);
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

  // The engine stops here: it has cryptographically verified the signature and
  // certificate and produced a normalized identity. User matching, certificate
  // ↔ user binding and the `identity.verified` / `document.signed` webhooks are
  // the consumer's job (see modules/auth_e_signature) — keeping them out avoids
  // the engine depending on the auth layer. We return the raw claims so the
  // consumer can bind without re-parsing the certificate.
  await deleteTransaction(transactionId);

  return {
    status: 'signed',
    identity,
    certificate: poll.certificate,
    transactionRecord: record,
    rawClaims,
  };
}
