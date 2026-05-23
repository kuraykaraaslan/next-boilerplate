import { z } from 'zod';

export const DomainStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'VERIFIED',
  'DNS_FAILED'
]);

export const VerificationMethodEnum = z.enum([
  'TXT',
  'CNAME'
]);

// SSL provisioning lifecycle for a custom tenant domain. The
// `ssl_provisioning.service` walks rows through these states as ACME
// (Let's Encrypt) issuance progresses.
export const SslStatusEnum = z.enum([
  'DISABLED',
  'PENDING',
  'PROVISIONING',
  'ACTIVE',
  'EXPIRING',
  'EXPIRED',
  'FAILED',
]);

export type DomainStatus = z.infer<typeof DomainStatusEnum>;
export type VerificationMethod = z.infer<typeof VerificationMethodEnum>;
export type SslStatus = z.infer<typeof SslStatusEnum>;
