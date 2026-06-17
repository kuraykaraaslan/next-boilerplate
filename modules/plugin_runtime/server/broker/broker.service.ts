// The internal capability broker — the ONLY tier with DB/storage credentials.
// The plugin-host (which holds no creds) forwards every `host.*` call here over
// RPC; this service re-enforces scoping it cannot trust the caller for and runs the
// real operation by reusing existing first-party services. It imports NO
// isolated-vm, so it never enters the web/Next bundle's untrusted path.
//
// Every operation is auto-scoped to (tenantId, pluginId). The plugin can never
// widen that scope: tenantId/pluginId/grants are bound host-side per call and
// re-validated here.

import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import Logger from '@kuraykaraaslan/logger';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import { assertSafeWebhookUrl } from '@kuraykaraaslan/webhook/server/webhook.ssrf';
import { PluginKv } from '../entities/plugin_kv.entity';
import type { Capability, Json } from '../../sdk/types';

export interface BrokerCtx {
  tenantId: string;
  pluginId: string;
  capabilities: Capability[];
  /** Approved outbound hosts (from the reviewed manifest), bound host-side. */
  httpAllowlist: string[];
  limits: { httpTimeoutMs: number; httpMaxBytes: number };
}

const SETTING_PREFIX = (pluginId: string) => `plugin:${pluginId}:`;
const SECRET_PREFIX = (pluginId: string) => `plugin_secret:${pluginId}:`;

function requireCap(ctx: BrokerCtx, cap: Capability): void {
  if (!ctx.capabilities.includes(cap)) throw new Error(`capability not granted: ${cap}`);
}

// Signed egress: a plugin may put `{{secret:NAME}}` in an http header/body; the
// broker substitutes the plugin's decrypted secret HOST-SIDE so the isolate never
// sees raw credentials. Combined with the http allowlist, the secret can only ever
// reach the approved provider host.
const SECRET_PLACEHOLDER = /\{\{secret:([A-Za-z0-9_]+)\}\}/g;
async function resolveSecret(ctx: BrokerCtx, name: string): Promise<string> {
  const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + name);
  const dec = decryptFieldOpt(raw);
  return typeof dec === 'string' ? dec : '';
}
async function substituteSecrets(ctx: BrokerCtx, value: string): Promise<string> {
  const names = [...value.matchAll(SECRET_PLACEHOLDER)].map((m) => m[1]);
  if (names.length === 0) return value;
  const map = new Map<string, string>();
  for (const n of new Set(names)) map.set(n, await resolveSecret(ctx, n));
  return value.replace(SECRET_PLACEHOLDER, (_, n) => map.get(n) ?? '');
}

// ── data: per-(tenant,plugin) KV/document store ─────────────────────────────────
const data = {
  async get(ctx: BrokerCtx, collection: string, key: string): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    const row = await ds.getRepository(PluginKv).findOne({
      where: { tenantId: ctx.tenantId, pluginId: ctx.pluginId, collection: String(collection), key: String(key) },
    });
    return (row?.value as Json) ?? null;
  },
  async put(ctx: BrokerCtx, collection: string, key: string, value: Json): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    const repo = ds.getRepository(PluginKv);
    await repo.upsert(
      { tenantId: ctx.tenantId, pluginId: ctx.pluginId, collection: String(collection), key: String(key), value: value as never },
      ['tenantId', 'pluginId', 'collection', 'key'],
    );
    return null;
  },
  async delete(ctx: BrokerCtx, collection: string, key: string): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    await ds.getRepository(PluginKv).delete({
      tenantId: ctx.tenantId, pluginId: ctx.pluginId, collection: String(collection), key: String(key),
    });
    return null;
  },
  async list(ctx: BrokerCtx, collection: string, opts?: { prefix?: string; limit?: number; offset?: number; withValues?: boolean }): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    const qb = ds.getRepository(PluginKv).createQueryBuilder('kv')
      .where('kv.tenantId = :t AND kv.pluginId = :p AND kv.collection = :c', { t: ctx.tenantId, p: ctx.pluginId, c: String(collection) });
    if (opts?.prefix) qb.andWhere('kv.key LIKE :pre', { pre: `${opts.prefix}%` });
    qb.orderBy('kv.key', 'ASC').take(Math.min(opts?.limit ?? 100, 500)).skip(opts?.offset ?? 0);
    const rows = await qb.getMany();
    return rows.map((r) => (opts?.withValues ? { key: r.key, value: r.value as Json } : { key: r.key })) as Json;
  },
};

// ── settings: plugin-namespaced, non-secret ─────────────────────────────────────
const settings = {
  async get(ctx: BrokerCtx, key: string): Promise<Json> {
    return (await SettingService.getValue(ctx.tenantId, SETTING_PREFIX(ctx.pluginId) + String(key))) ?? null;
  },
  async getMany(ctx: BrokerCtx, keys: string[]): Promise<Json> {
    const prefixed = (keys ?? []).map((k) => SETTING_PREFIX(ctx.pluginId) + String(k));
    const rec = await SettingService.getByKeys(ctx.tenantId, prefixed);
    const out: Record<string, string> = {};
    for (const k of keys ?? []) { const v = rec[SETTING_PREFIX(ctx.pluginId) + String(k)]; if (v != null) out[k] = v; }
    return out as Json;
  },
  async set(ctx: BrokerCtx, key: string, value: string): Promise<Json> {
    await SettingService.updateMany(ctx.tenantId, { [SETTING_PREFIX(ctx.pluginId) + String(key)]: String(value) }, { actorId: `plugin:${ctx.pluginId}` });
    return null;
  },
};

// ── secrets: read-only, decrypted host-side ─────────────────────────────────────
const secrets = {
  async get(ctx: BrokerCtx, key: string): Promise<Json> {
    const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + String(key));
    if (raw == null) return null;
    const dec = decryptFieldOpt(raw);
    return (typeof dec === 'string' ? dec : null);
  },
};

// ── http: SSRF-guarded, allowlisted egress ──────────────────────────────────────
const http = {
  async fetch(ctx: BrokerCtx, url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number }): Promise<Json> {
    let parsed: URL;
    try { parsed = new URL(String(url)); } catch { throw new Error('invalid url'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('only http(s) allowed');
    if (!ctx.httpAllowlist.includes(parsed.host)) throw new Error(`host not in allowlist: ${parsed.host}`);
    await assertSafeWebhookUrl(parsed.toString()); // DNS-rebinding-safe SSRF check
    const controller = new AbortController();
    const timeout = Math.min(init?.timeoutMs ?? ctx.limits.httpTimeoutMs, ctx.limits.httpTimeoutMs);
    const t = setTimeout(() => controller.abort(), timeout);
    try {
      // Inject any {{secret:NAME}} placeholders host-side (signed egress).
      const reqHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(init?.headers ?? {})) reqHeaders[k] = await substituteSecrets(ctx, String(v));
      const reqBody = init?.body != null ? await substituteSecrets(ctx, String(init.body)) : undefined;
      const res = await fetch(parsed.toString(), {
        method: init?.method ?? 'GET',
        headers: reqHeaders,
        body: reqBody,
        signal: controller.signal,
        redirect: 'manual', // do not silently follow redirects past the allowlist
      });
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > ctx.limits.httpMaxBytes) throw new Error('response too large');
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      return { status: res.status, headers: resHeaders, body: buf.toString('utf8') } as Json;
    } finally {
      clearTimeout(t);
    }
  },
};

// ── storage: scoped blob storage under plugins/<pluginId>/ ───────────────────────
const storage = {
  async put(ctx: BrokerCtx, path: string, data: { base64: string; contentType?: string }): Promise<Json> {
    const buffer = Buffer.from(data.base64, 'base64');
    const res = await StorageService.uploadServerBuffer(ctx.tenantId, {
      buffer, filename: String(path).replace(/^\/+/, ''), contentType: data.contentType, folder: `plugins/${ctx.pluginId}`,
    });
    return { key: res.key } as Json;
  },
  async getUrl(ctx: BrokerCtx, path: string, expiresSeconds?: number): Promise<Json> {
    return (await StorageService.getPresignedUrl(ctx.tenantId, String(path), expiresSeconds ?? 900)) as Json;
  },
  async delete(ctx: BrokerCtx, path: string): Promise<Json> {
    await StorageService.deleteFile(ctx.tenantId, { key: String(path) } as never);
    return null;
  },
};

// ── events: structured log + scoped audit ───────────────────────────────────────
const events = {
  async log(ctx: BrokerCtx, level: 'info' | 'warn' | 'error', message: string, meta?: Json): Promise<Json> {
    const line = `[plugin:${ctx.pluginId}] ${String(message)}`;
    if (level === 'error') Logger.error(line, meta as object);
    else if (level === 'warn') Logger.warn(line, meta as object);
    else Logger.info(line, meta as object);
    return null;
  },
  async emit(ctx: BrokerCtx, event: string, payload: Json): Promise<Json> {
    await AuditLogService.log({
      tenantId: ctx.tenantId,
      actorId: null,
      action: `plugin.${ctx.pluginId}.${String(event)}`,
      resourceType: 'plugin_event',
      resourceId: ctx.pluginId,
      metadata: { payload } as Record<string, unknown>,
    });
    return null;
  },
};

/**
 * Single entry point the RPC layer calls. Validates the capability grant, then
 * routes to the matching broker. Unknown capability/method → throws.
 */
export async function dispatch(ctx: BrokerCtx, capability: string, method: string, args: Json[]): Promise<Json> {
  const a = args ?? [];
  switch (capability) {
    case 'data':
      requireCap(ctx, 'data');
      if (method === 'get') return data.get(ctx, a[0] as string, a[1] as string);
      if (method === 'put') return data.put(ctx, a[0] as string, a[1] as string, a[2] as Json);
      if (method === 'delete') return data.delete(ctx, a[0] as string, a[1] as string);
      if (method === 'list') return data.list(ctx, a[0] as string, a[1] as never);
      break;
    case 'settings':
      requireCap(ctx, 'settings');
      if (method === 'get') return settings.get(ctx, a[0] as string);
      if (method === 'getMany') return settings.getMany(ctx, a[0] as string[]);
      if (method === 'set') return settings.set(ctx, a[0] as string, a[1] as string);
      break;
    case 'secrets':
      requireCap(ctx, 'secrets');
      if (method === 'get') return secrets.get(ctx, a[0] as string);
      break;
    case 'http':
      requireCap(ctx, 'http');
      if (method === 'fetch') return http.fetch(ctx, a[0] as string, a[1] as never);
      break;
    case 'storage':
      requireCap(ctx, 'storage');
      if (method === 'put') return storage.put(ctx, a[0] as string, a[1] as never);
      if (method === 'getUrl') return storage.getUrl(ctx, a[0] as string, a[1] as number);
      if (method === 'delete') return storage.delete(ctx, a[0] as string);
      break;
    case 'events':
      requireCap(ctx, 'events');
      if (method === 'log') return events.log(ctx, a[0] as never, a[1] as string, a[2] as Json);
      if (method === 'emit') return events.emit(ctx, a[0] as string, a[1] as Json);
      break;
  }
  throw new Error(`unknown capability/method: ${capability}.${method}`);
}
