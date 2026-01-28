import { z } from 'zod';
import { TenantStatusEnum } from './tenant.enums';
import { TenantDomainSchema } from '../tenant_domain/tenant_domain.types';

export const TenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  tenantStatus: TenantStatusEnum.default('ACTIVE'),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),

  domains: TenantDomainSchema.array().nullable().optional()
});

export const SafeTenantSchema = TenantSchema.omit({
  deletedAt: true
});

export type Tenant = z.infer<typeof TenantSchema>;
export type SafeTenant = z.infer<typeof SafeTenantSchema>;
