import { z } from 'zod';
import { TenantStatusEnum } from './tenant.enums';

export const CreateTenantDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  region: z.string().default('TR')
});

export const UpdateTenantDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable(),
  region: z.string().nullable(),
  tenantStatus: TenantStatusEnum.optional()
});

export const GetTenantDTO = z.object({
  tenantId: z.string().uuid().nullable()
}).refine((data) => data.tenantId, {
  message: "tenantId must be provided"
});

export const GetTenantsDTO = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(10),
  search: z.string().nullable(),
  tenantId: z.string().uuid().nullable()
});

export type CreateTenantInput = z.infer<typeof CreateTenantDTO>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantDTO>;
export type GetTenantInput = z.infer<typeof GetTenantDTO>;
export type GetTenantsInput = z.infer<typeof GetTenantsDTO>;
