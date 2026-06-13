import { z } from 'zod';
import { TenantStatusEnum } from './tenant.enums';
import { ALLOWED_REGIONS } from './entities/tenant.entity';

const TenantRegionSchema = z.enum([...ALLOWED_REGIONS] as [string, ...string[]]).default('TR');

// URL-safe slug: lowercase letters, digits, hyphens (no leading/trailing hyphen)
const SlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Slug must be lowercase alphanumeric with hyphens')
  .optional();

export const CreateTenantDefaultsDTO = z.object({
  skipPlan: z.boolean().optional(),
  skipSubscription: z.boolean().optional(),
  skipSettings: z.boolean().optional(),
}).optional();

export const CreateTenantDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  region: TenantRegionSchema,
  slug: SlugSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  defaults: CreateTenantDefaultsDTO,
});

export const UpdateTenantDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable(),
  region: TenantRegionSchema.optional(),
  slug: SlugSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  tenantStatus: TenantStatusEnum.optional(),
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
