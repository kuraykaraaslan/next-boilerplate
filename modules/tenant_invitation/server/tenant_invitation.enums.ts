import { z } from 'zod';

export const TenantInvitationStatusEnum = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'REVOKED'
]);

export type TenantInvitationStatus = z.infer<typeof TenantInvitationStatusEnum>;
