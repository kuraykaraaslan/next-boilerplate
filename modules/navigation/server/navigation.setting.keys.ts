import { z } from 'zod';

// Canonical per-tenant setting keys for the navigation module. Centralised so
// the service (runtime behavior) and the settings-fields file (admin UI) never
// drift apart.
export const NavigationSettingKeySchema = z.enum([
  'navigationDefaultLocation',
  'navigationMaxDepth',
  'navigationCacheTtlSeconds',
]);
export type NavigationSettingKey = z.infer<typeof NavigationSettingKeySchema>;
export const NAVIGATION_SETTING_KEY_LIST = NavigationSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const NAVIGATION_SETTING_KEYS = {
  DEFAULT_LOCATION: 'navigationDefaultLocation',
  MAX_DEPTH: 'navigationMaxDepth',
  CACHE_TTL_SECONDS: 'navigationCacheTtlSeconds',
} as const satisfies Record<string, NavigationSettingKey>;
