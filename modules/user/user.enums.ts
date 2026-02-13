import { z } from 'zod';

export const UserRoleEnum = z.enum(['USER', 'ADMIN']);
export const UserStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

export type UserRole = z.infer<typeof UserRoleEnum>;
export type UserStatus = z.infer<typeof UserStatusEnum>;
