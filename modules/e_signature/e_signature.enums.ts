import { z } from 'zod';

export const LoAEnum = z.enum(['low', 'substantial', 'high']);
export type LoA = z.infer<typeof LoAEnum>;

export const ProviderCapabilityEnum = z.enum([
  'login',
  'sign_pades',
  'sign_cades',
  'sign_xades',
  'sign_jades',
]);
export type ProviderCapability = z.infer<typeof ProviderCapabilityEnum>;

export const SignatureFormatEnum = z.enum(['PAdES', 'CAdES', 'XAdES', 'JAdES']);
export type SignatureFormat = z.infer<typeof SignatureFormatEnum>;

export const TransactionStatusEnum = z.enum([
  'pending',
  'user_prompted',
  'signed',
  'failed',
  'expired',
  'cancelled',
]);
export type TransactionStatus = z.infer<typeof TransactionStatusEnum>;

export const PollResultStatusEnum = z.enum(['pending', 'signed', 'failed', 'expired']);
export type PollResultStatus = z.infer<typeof PollResultStatusEnum>;

export const FailureReasonEnum = z.enum([
  'user_cancelled',
  'user_timeout',
  'wrong_pin',
  'sim_inactive',
  'sim_unsupported',
  'certificate_invalid',
  'certificate_revoked',
  'signature_invalid',
  'loa_insufficient',
  'identifier_invalid',
  'provider_error',
  'unknown',
]);
export type FailureReason = z.infer<typeof FailureReasonEnum>;
