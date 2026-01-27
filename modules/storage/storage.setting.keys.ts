import { z } from 'zod';

// ============================================================================
// Storage Setting Keys (System-level storage configuration)
// ============================================================================

export const StorageSettingKeySchema = z.enum([
  'storageProvider', 's3Bucket', 's3Region', 's3AccessKey', 's3SecretKey', 's3Endpoint',
  'maxFileSizeMb', 'allowedExtensions',
]);
export type StorageSettingKey = z.infer<typeof StorageSettingKeySchema>;
export const STORAGE_KEYS = StorageSettingKeySchema.options;
