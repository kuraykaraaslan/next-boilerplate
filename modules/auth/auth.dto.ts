import { z } from 'zod';

export const LoginDTO = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const RegisterDTO = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional()
});

export const LogoutDTO = z.object({
  accessToken: z.string()
});

export const ForgotPasswordDTO = z.object({
  email: z.string().email()
});

export const ResetPasswordDTO = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const ChangePasswordDTO = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});

export const VerifyEmailDTO = z.object({
  token: z.string()
});

export type LoginInput = z.infer<typeof LoginDTO>;
export type RegisterInput = z.infer<typeof RegisterDTO>;
export type LogoutInput = z.infer<typeof LogoutDTO>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordDTO>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordDTO>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordDTO>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailDTO>;
