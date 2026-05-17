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
  'allowRegistration', 'emailVerificationRequired', 'sessionDuration', 'maxLoginAttempts',
  'ssoAllowedProviders',
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
  // ── Social login (KD-18) ──────────────────────────────────────────────────
  'disableSocialLogin',
  // ── CAPTCHA threshold (KD-19) ─────────────────────────────────────────────
  'captchaTriggerAttempts',
  // ── Single-session enforcement (KD-21) ────────────────────────────────────
  'singleSessionOnly',
]);
export type AuthSettingKey = z.infer<typeof AuthSettingKeySchema>;
export const AUTH_KEYS = AuthSettingKeySchema.options;
