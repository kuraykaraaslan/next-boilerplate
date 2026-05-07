import { z } from 'zod';
import { DomainStatusEnum, VerificationMethodEnum } from './tenant_domain.enums';

export const TenantDomainSchema = z.object({
  tenantDomainId: z.string().uuid(),
  tenantId: z.string().uuid(),
  domain: z.string(),
  isPrimary: z.boolean().default(false),
  domainStatus: DomainStatusEnum.default('PENDING'),
  verificationToken: z.string().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable()
});

export const SafeTenantDomainSchema = TenantDomainSchema.omit({
  verificationToken: true
});

export const DomainVerificationInfoSchema = z.object({
  domain: z.string(),
  method: VerificationMethodEnum,
  recordName: z.string(),
  recordValue: z.string(),
  domainStatus: DomainStatusEnum
});

export type TenantDomain = z.infer<typeof TenantDomainSchema>;
export type SafeTenantDomain = z.infer<typeof SafeTenantDomainSchema>;
export type DomainVerificationInfo = z.infer<typeof DomainVerificationInfoSchema>;
