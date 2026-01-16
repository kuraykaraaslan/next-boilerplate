import { z } from "zod";

// Settings Request/Response DTOs
export const GetSettingsRequestSchema = z.object({
    // No parameters needed - just get all settings
});

export const GetSettingsResponseSchema = z.object({
    success: z.boolean(),
    settings: z.record(z.any()),
    message: z.string().optional(),
});

export const UpdateSettingsRequestSchema = z.object({
    settings: z.record(z.any()).refine(
        (obj) => Object.keys(obj).length > 0,
        {
            message: "Settings object cannot be empty",
        }
    ),
});

export const UpdateSettingsResponseSchema = z.object({
    success: z.boolean(),
    settings: z.record(z.any()),
    message: z.string().optional(),
});

export const GetSettingsByKeysRequestSchema = z.object({
    keys: z.array(z.string()).min(1, "At least one key is required")
});

export const GetSettingsByKeysResponseSchema = z.object({
    success: z.boolean(),
    settings: z.record(z.any()),
    message: z.string().optional(),
});

// Type exports
export type GetSettingsRequest = z.infer<typeof GetSettingsRequestSchema>;
export type GetSettingsResponse = z.infer<typeof GetSettingsResponseSchema>;
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;
export type UpdateSettingsResponse = z.infer<typeof UpdateSettingsResponseSchema>;
export type GetSettingsByKeysRequest = z.infer<typeof GetSettingsByKeysRequestSchema>;
export type GetSettingsByKeysResponse = z.infer<typeof GetSettingsByKeysResponseSchema>;
