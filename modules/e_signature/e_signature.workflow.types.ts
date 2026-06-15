import type { CountryCode, RawIdentityClaims, TransactionRecord, VerifiedIdentity } from './e_signature.types';

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
      // Raw provider claims, handed to the consumer (auth_e_signature) so it can
      // match/bind the certificate to a user without re-parsing it. The engine
      // itself performs no user matching or binding.
      rawClaims: RawIdentityClaims;
    };
