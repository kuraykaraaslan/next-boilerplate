import { z } from 'zod';

export const ApiKeyScopeEnum = z.enum([
  'read',
  'write',
  'admin',
  // SCIM 2.0 (RFC 7644) — IdP provisioning bearer tokens.
  'scim:read',
  'scim:write',
]);
export type ApiKeyScope = z.infer<typeof ApiKeyScopeEnum>;

export const API_KEY_SCOPES: ApiKeyScope[] = [
  'read',
  'write',
  'admin',
  'scim:read',
  'scim:write',
];

// Environment namespace for a key. Baked into the raw-key prefix
// (`sk_live_…` / `sk_test_…`) so test credentials can never be mistaken for
// production ones and vice versa.
export const ApiKeyEnvEnum = z.enum(['live', 'test']);
export type ApiKeyEnv = z.infer<typeof ApiKeyEnvEnum>;

// ── Resource-level scopes ─────────────────────────────────────────────────
// Beyond the coarse read/write/admin verbs, keys may hold fine-grained
// `resource:action` scopes (e.g. `invoices:read`, `users:write`, `orders:*`).
export const ResourceScopeRegex = /^[a-z0-9_]+:(read|write|admin|\*)$/;

/** Accepts a coarse verb OR a `resource:action` scope. */
export const AnyScopeSchema = z.union([ApiKeyScopeEnum, z.string().regex(ResourceScopeRegex)]);

/**
 * True when a key's granted scopes satisfy a required scope, honouring the
 * hierarchy: `admin`/`*` grant everything; `write` implies `read`;
 * `resource:admin` / `resource:*` grant any action on that resource;
 * `resource:write` implies `resource:read`.
 */
export function scopeSatisfies(granted: string[], required: string): boolean {
  if (!required) return true;
  if (granted.includes('admin') || granted.includes('*')) return true;
  if (granted.includes(required)) return true;
  if (required === 'read' && granted.includes('write')) return true;
  const [res, action] = required.split(':');
  if (res && action) {
    if (granted.includes(`${res}:admin`) || granted.includes(`${res}:*`)) return true;
    if (action === 'read' && granted.includes(`${res}:write`)) return true;
  }
  return false;
}

/** True when every requested scope is permitted by the allowlist (empty = allow all). */
export function scopesWithinAllowlist(requested: string[], allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  if (allowlist.includes('admin') || allowlist.includes('*')) return true;
  return requested.every((s) => scopeSatisfies(allowlist, s));
}
