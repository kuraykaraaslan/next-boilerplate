import ESignatureWorkflowService from '@nb/e_signature/server/e_signature.workflow.service';
import WebhookService from '@nb/webhook/server/webhook.service';
import AuthESignatureCertService from './auth_e_signature.cert.service';
import { findUserByCountryFallback } from './auth_e_signature.match';
import type { ESignatureLoginResult } from './auth_e_signature.types';

/**
 * Auth-layer orchestration over the `e_signature` engine. The engine
 * cryptographically verifies the signature/certificate and normalizes the
 * identity; this service then matches (or binds) the certificate to a user and
 * dispatches the `identity.verified` / `document.signed` webhooks.
 */
export default class AuthESignatureFlowService {
  static async completeLogin({
    transactionId,
    ip,
    ua,
  }: {
    transactionId: string;
    ip: string | null;
    ua: string | null;
  }): Promise<ESignatureLoginResult> {
    const result = await ESignatureWorkflowService.pollStatus({ transactionId, ip, ua });
    if (result.status !== 'signed') {
      return result;
    }

    const { identity, certificate, transactionRecord: record, rawClaims } = result;

    const bound = await AuthESignatureCertService.findByFingerprint(rawClaims.certFingerprintSha256);
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
      const newBound = await AuthESignatureCertService.bind({
        userId: record.initiatingUserId,
        providerName: record.providerName,
        country: record.country,
        claims: rawClaims,
        loa: identity.loa,
        subjectDN: rawClaims.commonName ? `CN=${rawClaims.commonName}` : `serial=${rawClaims.certSerialHex}`,
      });
      matchedUserId = record.initiatingUserId;
      boundSigningCertificateId = newBound.signingCertificateId;
    }

    if (boundSigningCertificateId) {
      await AuthESignatureCertService.markUsed(boundSigningCertificateId).catch(() => {});
    }

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
      certificate,
      transactionRecord: record,
      matchedUserId,
      boundSigningCertificateId,
    };
  }
}
