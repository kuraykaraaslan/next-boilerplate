import { z } from 'zod';

export const DomainStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'VERIFIED'
]);

export const VerificationMethodEnum = z.enum([
  'TXT',
  'CNAME'
]);

export type DomainStatus = z.infer<typeof DomainStatusEnum>;
export type VerificationMethod = z.infer<typeof VerificationMethodEnum>;
