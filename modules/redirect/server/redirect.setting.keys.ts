import { z } from 'zod';

// Canonical per-tenant setting keys for the redirect module. Centralised so the
// service (runtime enforcement) and the settings-fields file (admin UI) never
// drift apart.
export const RedirectSettingKeySchema = z.enum([
  'redirectDefaultStatusCode',
  'redirectCaseSensitive',
  'redirectLogHits',
]);
export type RedirectSettingKey = z.infer<typeof RedirectSettingKeySchema>;
export const REDIRECT_SETTING_KEY_LIST = RedirectSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const REDIRECT_SETTING_KEYS = {
  DEFAULT_STATUS_CODE: 'redirectDefaultStatusCode',
  CASE_SENSITIVE: 'redirectCaseSensitive',
  LOG_HITS: 'redirectLogHits',
} as const satisfies Record<string, RedirectSettingKey>;
