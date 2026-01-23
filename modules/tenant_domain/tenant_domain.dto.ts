import { z } from 'zod';
import { DomainStatusEnum, VerificationMethodEnum } from './tenant_domain.enums';

export const CreateTenantDomainDTO = z.object({
  tenantId: z.string().uuid(),
  domain: z.string().min(1).max(255),
  isPrimary: z.boolean().default(false)
});

export const UpdateTenantDomainDTO = z.object({
  isPrimary: z.boolean().optional(),
  domainStatus: DomainStatusEnum.optional()
});

export const GetTenantDomainsDTO = z.object({
  tenantId: z.string().uuid(),
  page: z.number().default(1),
  pageSize: z.number().default(10)
});

export const InitiateVerificationDTO = z.object({
  tenantDomainId: z.string().uuid(),
  method: VerificationMethodEnum.default('TXT')
});

export const VerifyDomainDTO = z.object({
  tenantDomainId: z.string().uuid()
});

export type CreateTenantDomainInput = z.infer<typeof CreateTenantDomainDTO>;
export type UpdateTenantDomainInput = z.infer<typeof UpdateTenantDomainDTO>;
export type GetTenantDomainsInput = z.infer<typeof GetTenantDomainsDTO>;
export type InitiateVerificationInput = z.infer<typeof InitiateVerificationDTO>;
export type VerifyDomainInput = z.infer<typeof VerifyDomainDTO>;
