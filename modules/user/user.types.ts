import { z } from 'zod';
import { UserRoleEnum, UserStatusEnum } from './user.enums';

export const UserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  userRole: UserRoleEnum.default('USER'),
  userStatus: UserStatusEnum.default('ACTIVE'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().optional()
});

export const SafeUserSchema = UserSchema.omit({
  password: true,
  deletedAt: true
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  lastName: z.string().optional(),
  userRole: UserRoleEnum.optional(),
  userStatus: UserStatusEnum.optional()
});

export type User = z.infer<typeof UserSchema>;
export type SafeUser = z.infer<typeof SafeUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
