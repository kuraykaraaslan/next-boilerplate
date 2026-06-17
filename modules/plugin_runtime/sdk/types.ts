// Plugin authoring ABI (the contract community plugins build against) and the
// host capability surface. This file is the SINGLE source of truth for what a
// sandboxed plugin can see and do. It is pure types + tiny helpers — no Node, no
// isolated-vm, no db — so it can be shipped to plugin authors and imported by both
// the plugin-host (bridge) and the broker service.
//
// A plugin is untrusted code compiled to a single bundle that runs inside a V8
// isolate. It receives a frozen `host` object (the capability bridge) and registers
// handlers. It can ONLY reach data/network/storage through `host.*`; it has no
// module system, no `process`, `fs`, or `fetch`.

/** Capabilities a plugin may request in its manifest `sandbox.capabilities`. */
export type Capability = 'data' | 'http' | 'settings' | 'secrets' | 'storage' | 'events';

export const ALL_CAPABILITIES: Capability[] = [
  'data', 'http', 'settings', 'secrets', 'storage', 'events',
];

/** A JSON-serializable value — everything crossing the isolate boundary must be this. */
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

// ── Capability sub-APIs (all async — they cross the isolate→broker boundary) ─────

/** Scoped key-value / document store. Auto-namespaced to (tenantId, pluginId). No SQL. */
export interface DataApi {
  get(collection: string, key: string): Promise<Json | null>;
  put(collection: string, key: string, value: Json): Promise<void>;
  delete(collection: string, key: string): Promise<void>;
  /** List keys (and optionally values) in a collection, with simple pagination. */
  list(collection: string, opts?: { prefix?: string; limit?: number; offset?: number; withValues?: boolean }):
    Promise<Array<{ key: string; value?: Json }>>;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}
/** SSRF-guarded outbound HTTP, restricted to the manifest `httpAllowlist`. */
export interface HttpApi {
  fetch(url: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }): Promise<HttpResponse>;
}

/** Plugin-namespaced settings (non-secret config). */
export interface SettingsApi {
  get(key: string): Promise<string | null>;
  getMany(keys: string[]): Promise<Record<string, string>>;
  set(key: string, value: string): Promise<void>;
}

/** Read-only plugin secrets (set by the tenant admin, decrypted host-side). */
export interface SecretsApi {
  get(key: string): Promise<string | null>;
}

/** Scoped blob storage under plugins/<pluginId>/. */
export interface StorageApi {
  put(path: string, data: { base64: string; contentType?: string }): Promise<{ key: string }>;
  getUrl(path: string, expiresSeconds?: number): Promise<string>;
  delete(path: string): Promise<void>;
}

/** Structured logging + (gated) event emission. */
export interface EventsApi {
  log(level: 'info' | 'warn' | 'error', message: string, meta?: Json): Promise<void>;
  emit(event: string, payload: Json): Promise<void>;
}

/**
 * The capability bridge handed to a plugin. Only granted capabilities are present
 * (others are absent — accessing them throws). `ctx` is bound host-side per call;
 * the plugin cannot change tenant/plugin/grants.
 */
export interface PluginHost {
  readonly ctx: {
    readonly pluginId: string;
    readonly capabilities: readonly Capability[];
  };
  readonly data?: DataApi;
  readonly http?: HttpApi;
  readonly settings?: SettingsApi;
  readonly secrets?: SecretsApi;
  readonly storage?: StorageApi;
  readonly events?: EventsApi;
}

// ── Plugin entrypoint / handler contract ────────────────────────────────────────

/** A sanitized HTTP request handed to a plugin handler (never a raw NextRequest). */
export interface PluginRequest {
  method: string;
  /** Path AFTER /api/plugins/<pluginId>/ — e.g. 'things/42'. */
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: Json;
}

export interface PluginResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: Json;
}

export type HttpHandler = (req: PluginRequest, host: PluginHost) => Promise<PluginResponse> | PluginResponse;
export type EventHandler = (payload: Json, host: PluginHost) => Promise<void> | void;

/**
 * Plugin entrypoint. The bundle's default export is a `PluginModule`. The host
 * calls `register(host)` once (optional) then dispatches to `handlers`.
 */
/**
 * A provider op-set: a plugin contribution into a host extension point (e.g.
 * 'ai:provider'), exposed as JSON-in/JSON-out ops instead of a live class. The
 * host calls ops via the provider runtime; each op receives its input + the host.
 */
export type ProviderOp = (input: Json, host: PluginHost) => Promise<Json> | Json;
export type ProviderOpSet = Record<string, ProviderOp>;

export interface PluginModule {
  http?: Record<string, HttpHandler>; // key: "GET things/:id" style route
  events?: Record<string, EventHandler>;
  /** Keyed by extension point id, e.g. providers['ai:provider'].chat(input, host). */
  providers?: Record<string, ProviderOpSet>;
  register?: (host: PluginHost) => void | Promise<void>;
}

// ── ai:provider op-set contract (what an isolated AI provider implements) ────────
// Inputs/outputs mirror the host's ai.types but as plain JSON.
export interface AIProviderOps {
  /** -> string[] of model ids. */
  listModels: ProviderOp;
  /** (ChatCompletionOptions) -> ChatCompletionResponse */
  chat: ProviderOp;
  /** (EmbeddingOptions) -> EmbeddingResponse (optional; omit if unsupported) */
  embed?: ProviderOp;
}
