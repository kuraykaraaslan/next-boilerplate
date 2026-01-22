import { z } from 'zod';
import { SSOProviderEnum } from './auth_sso.enums';

// ============================================================================
// SSO Authentication DTOs
// ============================================================================

export const GenerateAuthUrlDTO = z.object({
  provider: SSOProviderEnum,
  state: z.string().nullable()
});

export const HandleCallbackDTO = z.object({
  provider: SSOProviderEnum,
  code: z.string().min(1)
});

export const AuthenticateOrRegisterDTO = z.object({
  provider: SSOProviderEnum,
  code: z.string().min(1)
});

// ============================================================================
// Account Management DTOs
// ============================================================================

export const LinkAccountDTO = z.object({
  provider: SSOProviderEnum,
  code: z.string().min(1)
});

export const UnlinkAccountDTO = z.object({
  provider: SSOProviderEnum
});

export const GetLinkedAccountsDTO = z.object({
  // No additional fields needed - userId from context
});

// ============================================================================
// Type Exports
// ============================================================================

export type GenerateAuthUrlInput = z.infer<typeof GenerateAuthUrlDTO>;
export type HandleCallbackInput = z.infer<typeof HandleCallbackDTO>;
export type AuthenticateOrRegisterInput = z.infer<typeof AuthenticateOrRegisterDTO>;
export type LinkAccountInput = z.infer<typeof LinkAccountDTO>;
export type UnlinkAccountInput = z.infer<typeof UnlinkAccountDTO>;
export type GetLinkedAccountsInput = z.infer<typeof GetLinkedAccountsDTO>;
