import { z } from 'zod';

export const TenantStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'SUSPENDED',
  'DELETED',
  'ARCHIVED'
]);

export type TenantStatus = z.infer<typeof TenantStatusEnum>;
