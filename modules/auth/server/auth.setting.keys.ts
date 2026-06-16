import { z } from 'zod';

// ============================================================================
// General Setting Keys (System-level general configuration)
// ============================================================================

export const GeneralSettingKeySchema = z.enum([
  'siteName', 'siteUrl', 'siteDescription', 'logoUrl', 'faviconUrl',
  'applicationHost', 'applicationDomain', 'i18nLanguages',
  'contactName', 'contactTitle', 'contactEmail', 'contactPhone',
  'maintenanceMode', 'maintenanceMessage',
]);
export type GeneralSettingKey = z.infer<typeof GeneralSettingKeySchema>;
export const GENERAL_KEYS = GeneralSettingKeySchema.options;

// ============================================================================
// Auth Setting Keys (System-level auth configuration)
// ============================================================================

export const AuthSettingKeySchema = z.enum([
  'jwtAccessTokenSecret', 'jwtAccessTokenExpiresIn', 'jwtRefreshTokenSecret', 'jwtRefreshTokenExpiresIn',
  'oauthGoogle', 'oauthGitHub', 'oauthMicrosoft', 'oauthLinkedIn', 'oauthApple', 'oauthTwitter', 'oauthMeta', 'oauthAutodesk',
  'googleClientId', 'googleClientSecret',
  'githubClientId', 'githubClientSecret',
  'appleClientId', 'appleTeamId', 'appleKeyId', 'applePrivateKey',
  'metaClientId', 'metaClientSecret',
  'autodeskClientId', 'autodeskClientSecret',
  'gitlabToken', 'gitlabUser',
  // ── Password policy (KD-5 / KD-7) ─────────────────────────────────────────
  'passwordMinLength', 'passwordRequireUppercase', 'passwordRequireLowercase',
  'passwordRequireDigit', 'passwordRequireSpecial',
  'passwordHistoryCount', 'passwordMaxAgeDays',
  // ── Lockout policy (KD-9) ─────────────────────────────────────────────────
  'lockoutMaxAttempts', 'lockoutDurationMinutes',
  // ── Session policy (KD-11 / KD-12) ────────────────────────────────────────
  'sessionAbsoluteMaxHours', 'sessionIdleTimeoutMinutes',
  // ── Dormant account policy (KD-15) ────────────────────────────────────────
  'dormantAccountDays', 'dormantAccountAutoDisable',
  // ── Admin-panel hardening (KD-13) ─────────────────────────────────────────
  'adminPanelIpAllowlist', 'adminRequireMfa',
  // ── External-access MFA (KD-16) ───────────────────────────────────────────
  'externalRequireMfa',
  // ── TOTP branding (KD-22) ────────────────────────────────────────────────
  'totpIssuer',
  // ── Social login (KD-18) ──────────────────────────────────────────────────
  'disableSocialLogin',
  // ── CAPTCHA threshold (KD-19) ─────────────────────────────────────────────
  'captchaTriggerAttempts',
  // ── Single-session enforcement (KD-21) ────────────────────────────────────
  'singleSessionOnly',
  // ── Registration / verification posture (GTH-1 / GTH-12) ──────────────────
  'allowRegistration', 'emailVerificationRequired',
  // ── Per-provider SSO allow-list (GTH-2) ───────────────────────────────────
  'ssoAllowedProviders',
  // ── OTP / reset / email-verify per-tenant TTLs & limits (GTH-3) ───────────
  'otpLength', 'otpExpirySeconds', 'otpRateLimitSeconds', 'otpMaxAttempts',
  'resetTokenExpirySeconds', 'resetTokenLength',
  'emailVerifyTtlSeconds', 'emailVerifyRateLimitSeconds',
  // ── Per-tenant bcrypt cost (GTH-6) ────────────────────────────────────────
  'bcryptCost',
  // ── Compliance: password minimum age (GTH-9) ──────────────────────────────
  'passwordMinAgeDays',
  // ── Compliance: dormant-sweep erasure window (GTH-8) ──────────────────────
  'dormantDeleteAfterDays',
  // ── Tenant MFA method allow-list (GTH-13) ─────────────────────────────────
  'mfaAllowedMethods',
]);
export type AuthSettingKey = z.infer<typeof AuthSettingKeySchema>;
export const AUTH_KEYS = AuthSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
// Only the GOODTOHAVE keys are surfaced here; the policy loader reads the rest
// by literal key. Centralised so runtime enforcement and the admin settings UI
// never drift apart.
export const AUTH_SETTING_KEYS = {
  ALLOW_REGISTRATION: 'allowRegistration',
  EMAIL_VERIFICATION_REQUIRED: 'emailVerificationRequired',
  SSO_ALLOWED_PROVIDERS: 'ssoAllowedProviders',
  OTP_LENGTH: 'otpLength',
  OTP_EXPIRY_SECONDS: 'otpExpirySeconds',
  OTP_RATE_LIMIT_SECONDS: 'otpRateLimitSeconds',
  OTP_MAX_ATTEMPTS: 'otpMaxAttempts',
  RESET_TOKEN_EXPIRY_SECONDS: 'resetTokenExpirySeconds',
  RESET_TOKEN_LENGTH: 'resetTokenLength',
  EMAIL_VERIFY_TTL_SECONDS: 'emailVerifyTtlSeconds',
  EMAIL_VERIFY_RATE_LIMIT_SECONDS: 'emailVerifyRateLimitSeconds',
  BCRYPT_COST: 'bcryptCost',
  PASSWORD_MIN_AGE_DAYS: 'passwordMinAgeDays',
  DORMANT_DELETE_AFTER_DAYS: 'dormantDeleteAfterDays',
  MFA_ALLOWED_METHODS: 'mfaAllowedMethods',
  TOTP_ISSUER: 'totpIssuer',
} as const satisfies Record<string, AuthSettingKey>;
