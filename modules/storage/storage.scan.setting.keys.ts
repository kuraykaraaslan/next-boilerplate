import { z } from 'zod';

// ============================================================================
// Virus scanning setting keys (per-tenant). Kept separate from STORAGE_KEYS so
// reading the S3 config never pulls scanning config and vice-versa.
// ============================================================================

export const StorageScanSettingKeySchema = z.enum([
  'virusScanEnabled',          // 'true' | 'false' (default false)
  'virusScanMode',             // 'sync' | 'async' (default async)
  'virusScanProvider',         // 'virustotal'
  'virusScanApiKey',           // provider API key (secret)
  'virusScanTimeoutSeconds',   // per-scan budget (default 30)
  'virusScanInfectedAction',   // 'delete' | 'quarantine' (default quarantine)
  'virusScanQuarantineFolder', // folder prefix for quarantined objects (default 'quarantine')
]);
export type StorageScanSettingKey = z.infer<typeof StorageScanSettingKeySchema>;
export const STORAGE_SCAN_KEYS = StorageScanSettingKeySchema.options;
