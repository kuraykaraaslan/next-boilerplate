import type { TransactionRecord, VerifiedIdentity } from '@/modules/e_signature/e_signature.types';

/**
 * Result of completing an e-signature login/bind. Mirrors the engine's poll
 * result for the non-signed states, but the `signed` variant is enriched by the
 * auth layer with the matched user and the (possibly newly) bound certificate.
 */
export type ESignatureLoginResult =
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
