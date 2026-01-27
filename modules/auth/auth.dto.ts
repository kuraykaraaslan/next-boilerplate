import { z } from 'zod';
import { OTPMethodEnum, OTPActionEnum } from '../user_security/user_security.enums';

// ============================================================================
// Authentication DTOs
// ============================================================================

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

export const VerifyEmailDTO = z.object({
  token: z.string()
});

// ============================================================================
// Password DTOs
// ============================================================================

export const ForgotPasswordDTO = z.object({
  email: z.string().email()
});

export const ResetPasswordDTO = z.object({
  email: z.string().email(),
  resetToken: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});

export const ValidateResetTokenDTO = z.object({
  email: z.string().email(),
  resetToken: z.string()
});

export const InvalidateResetTokenDTO = z.object({
  email: z.string().email()
});

export const ChangePasswordDTO = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});

// ============================================================================
// OTP DTOs
// ============================================================================

export const RequestOTPDTO = z.object({
  method: OTPMethodEnum,
  action: OTPActionEnum
});

export const VerifyOTPDTO = z.object({
  method: OTPMethodEnum,
  action: OTPActionEnum,
  otpToken: z.string().min(4)
});

// ============================================================================
// TOTP DTOs
// ============================================================================

export const TOTPSetupDTO = z.object({
  // No additional fields needed - user/session from context
});

export const TOTPEnableDTO = z.object({
  otpToken: z.string().min(6).max(6)
});

export const TOTPVerifyDTO = z.object({
  otpToken: z.string().min(6).max(8) // 6 for TOTP, 8 for backup codes
});

export const TOTPDisableDTO = z.object({
  otpToken: z.string().min(6).max(6)
});

export const TOTPBackupCodesDTO = z.object({
  count: z.number().int().min(1).max(20).nullable().default(4)
});

export const TOTPConsumeBackupCodeDTO = z.object({
  code: z.string()
});

// ============================================================================
// Session DTOs
// ============================================================================

export const RefreshTokenDTO = z.object({
  refreshToken: z.string()
});

// ============================================================================
// Type Exports
// ============================================================================

export type LoginInput = z.infer<typeof LoginDTO>;
export type RegisterInput = z.infer<typeof RegisterDTO>;
export type LogoutInput = z.infer<typeof LogoutDTO>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailDTO>;

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordDTO>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordDTO>;
export type ValidateResetTokenInput = z.infer<typeof ValidateResetTokenDTO>;
export type InvalidateResetTokenInput = z.infer<typeof InvalidateResetTokenDTO>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordDTO>;

export type RequestOTPInput = z.infer<typeof RequestOTPDTO>;
export type VerifyOTPInput = z.infer<typeof VerifyOTPDTO>;

export type TOTPSetupInput = z.infer<typeof TOTPSetupDTO>;
export type TOTPEnableInput = z.infer<typeof TOTPEnableDTO>;
export type TOTPVerifyInput = z.infer<typeof TOTPVerifyDTO>;
export type TOTPDisableInput = z.infer<typeof TOTPDisableDTO>;
export type TOTPBackupCodesInput = z.infer<typeof TOTPBackupCodesDTO>;
export type TOTPConsumeBackupCodeInput = z.infer<typeof TOTPConsumeBackupCodeDTO>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenDTO>;
