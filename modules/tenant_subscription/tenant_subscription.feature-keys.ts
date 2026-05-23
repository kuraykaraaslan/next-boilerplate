export const FEATURE_KEYS = {
  // LIMIT features — value is max count, -1 = unlimited
  MAX_MEMBERS: 'max_members',
  MAX_INVITATIONS: 'max_invitations',
  STORAGE_GB: 'storage_gb',
  MAX_DOMAINS: 'max_domains',
  MAX_AI_REQUESTS: 'max_ai_requests',

  // BOOLEAN features — value is 'true' | 'false'
  CUSTOM_DOMAIN: 'custom_domain',
  API_ACCESS: 'api_access',
  SSO_LOGIN: 'sso_login',
  AUDIT_LOGS: 'audit_logs',
  AI_FEATURES: 'ai_features',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  PRIORITY_SUPPORT: 'priority_support',

  // Rate limit — requests per minute, -1 = unlimited
  API_RATE_LIMIT: 'api_rate_limit',

  // ===========================================================================
  // Billing-aware service gating keys (consumed by service layer in
  // AI / Mail / SMS / Storage / Webhook / API-key flows).
  // ---------------------------------------------------------------------------
  // BOOLEAN feature_* keys gate access to the capability itself.
  // LIMIT feature_*_quota / feature_*_monthly_* keys gate per-period usage and
  // are checked against the matching TenantUsage counter (Redis-backed).
  // ===========================================================================

  // AI
  FEATURE_AI_CHAT: 'feature_ai_chat',
  FEATURE_AI_MONTHLY_TOKENS: 'feature_ai_monthly_tokens',

  // Mail
  FEATURE_EMAIL_SEND: 'feature_email_send',
  FEATURE_EMAIL_MONTHLY_QUOTA: 'feature_email_monthly_quota',

  // SMS
  FEATURE_SMS_SEND: 'feature_sms_send',
  FEATURE_SMS_MONTHLY_QUOTA: 'feature_sms_monthly_quota',

  // Storage
  FEATURE_STORAGE_UPLOAD: 'feature_storage_upload',
  FEATURE_STORAGE_QUOTA_BYTES: 'feature_storage_quota_bytes',

  // Webhook
  FEATURE_WEBHOOKS: 'feature_webhooks',

  // API Key
  FEATURE_API_KEYS: 'feature_api_keys',

  // Invoicing / e-invoicing
  FEATURE_INVOICING: 'feature_invoicing',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
