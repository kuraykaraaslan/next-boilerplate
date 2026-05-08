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
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
