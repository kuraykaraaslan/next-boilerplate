import { z } from 'zod';

// Canonical per-tenant setting keys for the auth_impersonation module.
// Centralised so the service (runtime enforcement / TTL resolution) and the
// settings-fields file (admin UI) never drift apart.
//
// All keys are read against the TARGET tenant (the tenant whose user is being
// impersonated), so a high-security tenant can constrain how platform/tenant
// admins impersonate its users regardless of which flow initiates it.
export const ImpersonationSettingKeySchema = z.enum([
  // GOODTOHAVE #1 — per-tenant impersonation session TTL (minutes). Falls back
  // to 60 when unset/invalid. Consumed by the user_session orchestrator via
  // ImpersonationService.getImpersonationTtlMs(tenantId).
  'impersonationSessionTtlMinutes',
  // GOODTOHAVE #3 — when 'true', the start flow requires a step-up credential
  // (password re-entry or TOTP) before impersonation begins.
  'impersonationRequireStepUp',
  // GOODTOHAVE #4 — max concurrent active impersonation sessions per
  // impersonator targeting this tenant. 0 = unlimited.
  'impersonationMaxConcurrentPerImpersonator',
  // GOODTOHAVE #10 — when 'true', impersonation of this tenant's users is fully
  // disabled (including the system/platform flow).
  'impersonationDisabled',
  // GOODTOHAVE #12 — anomaly threshold: alert (webhook + counter) when a single
  // impersonator exceeds this many starts within one hour. 0 = disabled.
  'impersonationAlertStartsPerHour',
]);
export type ImpersonationSettingKey = z.infer<typeof ImpersonationSettingKeySchema>;
export const IMPERSONATION_SETTING_KEY_LIST = ImpersonationSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const IMPERSONATION_SETTING_KEYS = {
  SESSION_TTL_MINUTES: 'impersonationSessionTtlMinutes',
  REQUIRE_STEP_UP: 'impersonationRequireStepUp',
  MAX_CONCURRENT_PER_IMPERSONATOR: 'impersonationMaxConcurrentPerImpersonator',
  DISABLED: 'impersonationDisabled',
  ALERT_STARTS_PER_HOUR: 'impersonationAlertStartsPerHour',
} as const satisfies Record<string, ImpersonationSettingKey>;

// Fallbacks applied when a key is unset or fails to parse.
export const IMPERSONATION_DEFAULTS: {
  SESSION_TTL_MINUTES: number;
  MIN_SESSION_TTL_MINUTES: number;
  MAX_SESSION_TTL_MINUTES: number;
} = {
  /** Default impersonation session TTL when the setting is unset/invalid. */
  SESSION_TTL_MINUTES: 60,
  /** Hard floor / ceiling for the per-tenant TTL (minutes). */
  MIN_SESSION_TTL_MINUTES: 1,
  MAX_SESSION_TTL_MINUTES: 24 * 60,
};
