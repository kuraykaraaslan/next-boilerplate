import { z } from 'zod';
import { UserRoleEnum, UserStatusEnum } from './user.enums';

// ============================================================================
// User Management DTOs
// ============================================================================

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  phone: z.string().optional(),
  userRole: UserRoleEnum.optional()
});

export const UpdateUserRequestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  userRole: UserRoleEnum.optional(),
  userStatus: UserStatusEnum.optional()
});

export const GetAllUsersQuerySchema = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  userId: z.string().optional()
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
