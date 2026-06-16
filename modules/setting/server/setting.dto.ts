import { z } from 'zod';

// ============================================================================
// Setting DTOs
// ============================================================================

export const GetSettingsDTO = z.object({
  // No fields - returns all settings
});

export const GetSettingByKeyDTO = z.object({
  key: z.string().min(1)
});

export const GetSettingsByKeysDTO = z.object({
  keys: z.array(z.string().min(1))
});

export const CreateSettingDTO = z.object({
  key: z.string().min(1),
  value: z.string(),
  group: z.string().nullable(),
  type: z.string().nullable()
});

export const UpdateSettingDTO = z.object({
  key: z.string().min(1),
  value: z.string()
});

export const UpdateSettingsDTO = z.object({
  settings: z.record(z.string(), z.string())
});

export const DeleteSettingDTO = z.object({
  key: z.string().min(1)
});

// ============================================================================
// Response DTOs
// ============================================================================

export const GetSettingsResponseDTO = z.object({
  success: z.boolean(),
  settings: z.record(z.string(), z.string())
});

export const UpdateSettingsResponseDTO = z.object({
  success: z.boolean(),
  settings: z.record(z.string(), z.string())
});

// ============================================================================
// Type Exports
// ============================================================================

export type GetSettingsInput = z.infer<typeof GetSettingsDTO>;
export type GetSettingByKeyInput = z.infer<typeof GetSettingByKeyDTO>;
export type GetSettingsByKeysInput = z.infer<typeof GetSettingsByKeysDTO>;
export type CreateSettingInput = z.infer<typeof CreateSettingDTO>;
export type UpdateSettingInput = z.infer<typeof UpdateSettingDTO>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsDTO>;
export type DeleteSettingInput = z.infer<typeof DeleteSettingDTO>;
export type GetSettingsResponse = z.infer<typeof GetSettingsResponseDTO>;
export type UpdateSettingsResponse = z.infer<typeof UpdateSettingsResponseDTO>;
