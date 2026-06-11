import { z } from 'zod';
import {
  LoginDTO, RegisterDTO, LogoutDTO, VerifyEmailDTO,
  ForgotPasswordDTO, ResetPasswordDTO, ValidateResetTokenDTO, InvalidateResetTokenDTO, ChangePasswordDTO,
  RequestOTPDTO, VerifyOTPDTO,
  TOTPEnableDTO, TOTPVerifyDTO, TOTPDisableDTO, TOTPBackupCodesDTO, TOTPConsumeBackupCodeDTO,
  RefreshTokenDTO,
} from './auth.dto';

// GTH-16: OpenAPI / JSON-Schema export for the auth DTOs.
//
// Uses Zod v4's built-in `z.toJSONSchema()` (no extra dependency) to emit a
// machine-readable request contract for every auth endpoint DTO. Exposed via
// GET /tenant/[tenantId]/api/auth/openapi so integrators (identity brokers,
// middleware vendors) can codegen against the auth API.

type JsonSchema = Record<string, unknown>;

const DTOS: Record<string, z.ZodTypeAny> = {
  LoginDTO, RegisterDTO, LogoutDTO, VerifyEmailDTO,
  ForgotPasswordDTO, ResetPasswordDTO, ValidateResetTokenDTO, InvalidateResetTokenDTO, ChangePasswordDTO,
  RequestOTPDTO, VerifyOTPDTO,
  TOTPEnableDTO, TOTPVerifyDTO, TOTPDisableDTO, TOTPBackupCodesDTO, TOTPConsumeBackupCodeDTO,
  RefreshTokenDTO,
};

/** Build the `components.schemas` map for every auth DTO. */
export function buildAuthDtoSchemas(): Record<string, JsonSchema> {
  const schemas: Record<string, JsonSchema> = {};
  for (const [name, dto] of Object.entries(DTOS)) {
    schemas[name] = z.toJSONSchema(dto, { target: 'draft-2020-12' }) as JsonSchema;
  }
  return schemas;
}

/** Build a minimal OpenAPI 3.1 document exposing the auth DTOs as schemas. */
export function buildAuthOpenApiDocument(): JsonSchema {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Auth Module DTOs',
      version: '1.0.0',
      description: 'Machine-readable request schemas for the auth module endpoints.',
    },
    components: {
      schemas: buildAuthDtoSchemas(),
    },
  };
}
