import { z } from 'zod';
import { UserRoleEnum, UserStatusEnum } from './user.enums';
import { UserProfileSchema } from '../user_profile/user_profile.types';

// Helper to coerce dates from JSON (handles both Date and string)
const dateOrString = z.union([z.date(), z.string().datetime()]).transform(val => 
  typeof val === 'string' ? new Date(val) : val
).nullable();

export const UserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  userRole: UserRoleEnum.default('USER'),
  userStatus: UserStatusEnum.default('ACTIVE'),
  emailVerifiedAt: dateOrString,
  createdAt: dateOrString,
  updatedAt: dateOrString,
  deletedAt: dateOrString
});

export const SafeUserSchema = UserSchema.omit({
  password: true,
  deletedAt: true
}).extend({
  userProfile: z.object(UserProfileSchema.shape).nullable().optional()
});

export const UpdateUserSchema = z.object({
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  userRole: UserRoleEnum.nullable().optional(),
  userStatus: UserStatusEnum.nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;
export type SafeUser = z.infer<typeof SafeUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
