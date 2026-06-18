// Shared broker context + helpers used by every capability. Kept tiny and
// dependency-light so capability files import only what they need.

import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import type { Capability } from '../../sdk/types';

/** Per-call scope, bound host-side and re-validated by the broker. */
export interface BrokerCtx {
  tenantId: string;
  pluginId: string;
  capabilities: Capability[];
  /** Approved outbound hosts (from the reviewed manifest), bound host-side. */
  httpAllowlist: string[];
  limits: { httpTimeoutMs: number; httpMaxBytes: number };
}

/** Plugin-namespaced setting key (non-secret). */
export const SETTING_PREFIX = (pluginId: string): string => `plugin:${pluginId}:`;
/** Plugin-namespaced encrypted-secret key. */
export const SECRET_PREFIX = (pluginId: string): string => `plugin_secret:${pluginId}:`;

export function requireCap(ctx: BrokerCtx, cap: Capability): void {
  if (!ctx.capabilities.includes(cap)) throw new Error(`capability not granted: ${cap}`);
}

// Signed egress: a plugin may put `{{secret:NAME}}` in an http header/body; the
// broker substitutes the plugin's decrypted secret HOST-SIDE so the isolate never
// sees raw credentials. Combined with the http allowlist, the secret can only ever
// reach the approved provider host.
const SECRET_PLACEHOLDER = /\{\{secret:([A-Za-z0-9_]+)\}\}/g;

export async function resolveSecret(ctx: BrokerCtx, name: string): Promise<string> {
  const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + name);
  const dec = decryptFieldOpt(raw);
  return typeof dec === 'string' ? dec : '';
}

export async function substituteSecrets(ctx: BrokerCtx, value: string): Promise<string> {
  const names = [...value.matchAll(SECRET_PLACEHOLDER)].map((m) => m[1]);
  if (names.length === 0) return value;
  const map = new Map<string, string>();
  for (const n of new Set(names)) map.set(n, await resolveSecret(ctx, n));
  return value.replace(SECRET_PLACEHOLDER, (_, n) => map.get(n) ?? '');
}
