// Wire types + config shared by the three tiers. Two RPC hops:
//   web tier ──run──► plugin-host        (run a plugin handler)
//   plugin-host ──capability──► web tier broker  (do a scoped data/http/... op)
// Both hops are token-authenticated and meant for a private/loopback interface.
//
// Config is read straight from process.env (no env-schema coupling) so the
// plugin-host process stays self-contained and creds-less.

import type { Capability, Json } from '../../sdk/types';

export interface SandboxConfig {
  pluginVersionId: string;
  pluginId: string;
  capabilities: Capability[];
  httpAllowlist: string[];
  limits: { memoryMb: number; timeoutMs: number; httpTimeoutMs: number; httpMaxBytes: number };
}

/** web → plugin-host: run a handler. `bundleCode` is sent only on a cache miss. */
export interface RunRequest {
  tenantId: string;
  sandbox: SandboxConfig;
  kind: 'http' | 'event' | 'provider';
  /** http: route key "GET path"; event: event name; provider: "<point>#<op>". */
  target: string;
  /** http: serialized PluginRequest; event: serialized payload. */
  payloadJson: string;
  bundleCode?: string;
}

export type RunResult =
  | { ok: true; resultJson: string }
  | { ok: false; needBundle: true }
  | { ok: false; error: string };

/** plugin-host → web broker: one capability call. */
export interface BrokerRequest {
  tenantId: string;
  pluginId: string;
  capabilities: Capability[];
  httpAllowlist: string[];
  limits: { httpTimeoutMs: number; httpMaxBytes: number };
  capability: string;
  method: string;
  args: Json[];
}

export type BrokerResult = { value: Json } | { error: string };

export interface RuntimeConfig {
  hostPort: number;
  hostUrl: string;
  hostToken: string;
  brokerUrl: string;
  brokerToken: string;
  defaultLimits: SandboxConfig['limits'];
}

export function loadRuntimeConfig(): RuntimeConfig {
  const e = process.env;
  return {
    hostPort: Number(e.PLUGIN_HOST_PORT ?? 4500),
    hostUrl: e.PLUGIN_HOST_URL ?? 'http://127.0.0.1:4500',
    hostToken: e.PLUGIN_HOST_TOKEN ?? 'dev-host-token',
    brokerUrl: e.PLUGIN_BROKER_URL ?? 'http://127.0.0.1:3000/internal/api/plugin-broker',
    brokerToken: e.PLUGIN_BROKER_TOKEN ?? 'dev-broker-token',
    defaultLimits: {
      memoryMb: Number(e.PLUGIN_MEMORY_MB ?? 128),
      timeoutMs: Number(e.PLUGIN_TIMEOUT_MS ?? 5000),
      httpTimeoutMs: Number(e.PLUGIN_HTTP_TIMEOUT_MS ?? 5000),
      httpMaxBytes: Number(e.PLUGIN_HTTP_MAX_BYTES ?? 2_000_000),
    },
  };
}

/** Constant-time-ish token compare (avoids trivially short-circuiting on length). */
export function tokensMatch(a: string | null | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
