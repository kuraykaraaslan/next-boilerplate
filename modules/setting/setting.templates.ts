/**
 * Per-plan setting templates.
 * Apply a bundle when a tenant is created or upgrades/downgrades.
 * Keys must match existing setting keys; unknown keys are silently skipped by updateMany.
 */
export const SETTING_TEMPLATES: Record<string, Record<string, string>> = {
  starter: {
    aiDailyLimit: '1000',
    maxFileSizeMb: '10',
    storageQuotaMb: '500',
    couponMaxActive: '5',
    auditLogRetentionDays: '30',
    webhookMaxEndpoints: '3',
  },
  pro: {
    aiDailyLimit: '10000',
    maxFileSizeMb: '50',
    storageQuotaMb: '5000',
    couponMaxActive: '50',
    auditLogRetentionDays: '90',
    webhookMaxEndpoints: '10',
  },
  enterprise: {
    aiDailyLimit: '100000',
    maxFileSizeMb: '500',
    storageQuotaMb: '50000',
    couponMaxActive: '500',
    auditLogRetentionDays: '2555',
    webhookMaxEndpoints: '100',
  },
};
