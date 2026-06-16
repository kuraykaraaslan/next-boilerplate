import { z } from 'zod';
import { UserRoleEnum, UserStatusEnum } from './user.enums';

// ============================================================================
// User Management DTOs
// ============================================================================

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().nullable(),
  userRole: UserRoleEnum.nullable().transform(val => val ?? 'USER'),
  userStatus: UserStatusEnum.nullable().transform(val => val ?? 'ACTIVE')
});

export const UpdateUserRequestSchema = z.object({
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  userRole: UserRoleEnum.nullable(),
  userStatus: UserStatusEnum.nullable()
});

export const GetAllUsersQuerySchema = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(10),
  search: z.string().nullable(),
  userId: z.string().nullable()
});

export const GetUserByIdSchema = z.object({
  userId: z.string()
});

export const DeleteUserSchema = z.object({
  userId: z.string()
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type GetAllUsersQuery = z.infer<typeof GetAllUsersQuerySchema>;
export type GetUserById = z.infer<typeof GetUserByIdSchema>;
export type DeleteUser = z.infer<typeof DeleteUserSchema>;
