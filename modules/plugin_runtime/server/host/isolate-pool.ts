// The V8-isolate runtime for untrusted plugin code. Runs ONLY in the standalone
// plugin-host process (never imported by app/ or the broker — keeps the
// isolated-vm native addon out of the Next bundle and the broker tier).
//
// Isolation model:
//  • one Isolate per plugin VERSION (compiled bundle cached), `memoryLimit` in MB;
//  • a pool of warm sandboxes; each sandbox handles ONE call at a time (no shared
//    mutable global races), concurrency = pool size;
//  • the only host surface inside the isolate is a single `__hostCall(payload)`
//    reference (JSON in / JSON out, async). Everything else (`host.*`) is a pure-JS
//    shim built on top of it. No require/process/fs/fetch exist in the isolate.
//
// Per-call tenant context lives host-side (`sandbox._ctx`), set under the borrow
// lock; the plugin can never read or spoof it.

import ivm from 'isolated-vm';
import type { Capability, Json } from '../../sdk/types';

export interface CallCtx {
  tenantId: string;
  pluginId: string;
  capabilities: Capability[];
}

/** Resolves a capability call host-side (validates + runs the scoped operation). */
export type HostDispatch = (
  ctx: CallCtx,
  capability: string,
  method: string,
  args: Json[],
) => Promise<Json>;

export interface SandboxLimits {
  memoryMb: number;
  timeoutMs: number;
}

const DEFAULT_LIMITS: SandboxLimits = { memoryMb: 128, timeoutMs: 5000 };

/** Build the in-isolate bootstrap: the `host` shim + the dispatch helpers. */
function buildBootstrap(pluginId: string, capabilities: Capability[]): string {
  // Every host.* method funnels through __hostCall (the one reference). args are
  // JSON-serialized; the result is parsed and { error } is rethrown.
  const call = (cap: string, method: string) =>
    `(...args) => __hostCall(JSON.stringify({ cap: ${JSON.stringify(cap)}, method: ${JSON.stringify(method)}, args }))` +
    `.then((r) => { const o = JSON.parse(r); if (o && o.error) throw new Error(o.error); return o.value; })`;

  const api: Record<Capability, string> = {
    data: `{ get:${call('data', 'get')}, put:${call('data', 'put')}, delete:${call('data', 'delete')}, list:${call('data', 'list')} }`,
    http: `{ fetch:${call('http', 'fetch')} }`,
    settings: `{ get:${call('settings', 'get')}, getMany:${call('settings', 'getMany')}, set:${call('settings', 'set')} }`,
    secrets: `{ get:${call('secrets', 'get')} }`,
    storage: `{ put:${call('storage', 'put')}, getUrl:${call('storage', 'getUrl')}, delete:${call('storage', 'delete')} }`,
    events: `{ log:${call('events', 'log')}, emit:${call('events', 'emit')} }`,
  };
  const granted = capabilities.map((c) => `  ${c}: ${api[c]},`).join('\n');

  return `
    globalThis.host = Object.freeze({
      ctx: Object.freeze({ pluginId: ${JSON.stringify(pluginId)}, capabilities: Object.freeze(${JSON.stringify(capabilities)}) }),
${granted}
    });
    globalThis.__invokeHttp = async function (routeKey, reqJson) {
      const mod = globalThis.__plugin;
      if (!mod || !mod.http || typeof mod.http[routeKey] !== 'function') {
        return JSON.stringify({ status: 404, body: { error: 'no handler: ' + routeKey } });
      }
      const res = await mod.http[routeKey](JSON.parse(reqJson), globalThis.host);
      return JSON.stringify(res || {});
    };
    globalThis.__invokeEvent = async function (name, payloadJson) {
      const mod = globalThis.__plugin;
      const fn = mod && mod.events && mod.events[name];
      if (typeof fn === 'function') await fn(JSON.parse(payloadJson), globalThis.host);
      return '{}';
    };
  `;
}

class Sandbox {
  private readonly isolate: ivm.Isolate;
  private readonly context: ivm.Context;
  private _ctx: CallCtx | null = null;
  busy = false;

  private constructor(isolate: ivm.Isolate, context: ivm.Context) {
    this.isolate = isolate;
    this.context = context;
  }

  static async create(
    pluginId: string,
    capabilities: Capability[],
    bundleCode: string,
    dispatch: HostDispatch,
    limits: SandboxLimits,
  ): Promise<Sandbox> {
    const isolate = new ivm.Isolate({ memoryLimit: limits.memoryMb });
    const context = await isolate.createContext();
    const sandbox = new Sandbox(isolate, context);

    await context.global.set('global', context.global.derefInto());

    // The single host bridge. Reads sandbox._ctx (bound per call under the lock).
    // Pass the PLAIN function; evalClosure's `reference: true` references it as $0.
    const hostFn = async (payloadJson: string): Promise<string> => {
      try {
        const { cap, method, args } = JSON.parse(payloadJson) as { cap: string; method: string; args: Json[] };
        if (!sandbox._ctx) return JSON.stringify({ error: 'no active call context' });
        if (!sandbox._ctx.capabilities.includes(cap as Capability)) {
          return JSON.stringify({ error: `capability not granted: ${cap}` });
        }
        const value = await dispatch(sandbox._ctx, cap, method, args ?? []);
        return JSON.stringify({ value: value ?? null });
      } catch (e: any) {
        return JSON.stringify({ error: e?.message ?? 'host call failed' });
      }
    };

    await context.evalClosure(
      `globalThis.__hostCall = function (payload) {
         return $0.apply(undefined, [payload], { result: { promise: true, copy: true }, arguments: { copy: true } });
       };`,
      [hostFn],
      { arguments: { reference: true } },
    );

    // Install the host shim, then run the (untrusted) bundle which assigns __plugin.
    await (await isolate.compileScript(buildBootstrap(pluginId, capabilities))).run(context, { timeout: limits.timeoutMs });
    await (await isolate.compileScript(bundleCode)).run(context, { timeout: limits.timeoutMs });
    return sandbox;
  }

  /** Run an HTTP handler. One call at a time (caller holds the borrow lock). */
  async runHttp(ctx: CallCtx, routeKey: string, reqJson: string, timeoutMs: number): Promise<string> {
    this._ctx = ctx;
    try {
      await this.context.global.set('__call_route', routeKey);
      await this.context.global.set('__call_req', reqJson);
      const script = await this.isolate.compileScript('__invokeHttp(__call_route, __call_req)');
      return (await script.run(this.context, { timeout: timeoutMs, promise: true, copy: true })) as string;
    } finally {
      this._ctx = null;
    }
  }

  async runEvent(ctx: CallCtx, name: string, payloadJson: string, timeoutMs: number): Promise<void> {
    this._ctx = ctx;
    try {
      await this.context.global.set('__evt_name', name);
      await this.context.global.set('__evt_payload', payloadJson);
      const script = await this.isolate.compileScript('__invokeEvent(__evt_name, __evt_payload)');
      await script.run(this.context, { timeout: timeoutMs, promise: true, copy: true });
    } finally {
      this._ctx = null;
    }
  }

  dispose(): void {
    try { this.context.release(); } catch { /* already gone */ }
    try { if (!this.isolate.isDisposed) this.isolate.dispose(); } catch { /* already gone */ }
  }
}

interface PoolEntry {
  capabilities: Capability[];
  bundleCode: string;
  limits: SandboxLimits;
  sandboxes: Sandbox[];
  waiters: Array<(s: Sandbox) => void>;
}

/**
 * Manages warm sandboxes per plugin version. `register` pins a version's bundle;
 * `runHttp`/`runEvent` borrow a free sandbox (creating up to `poolSize`), run, and
 * return it. A crashed/timed-out sandbox is disposed and recreated, never reused.
 */
export class SandboxManager {
  private readonly pools = new Map<string, PoolEntry>(); // key: pluginVersionId
  constructor(
    private readonly dispatch: HostDispatch,
    private readonly poolSize = 2,
  ) {}

  register(pluginVersionId: string, pluginId: string, capabilities: Capability[], bundleCode: string, limits?: Partial<SandboxLimits>): void {
    this.pluginIdByVersion.set(pluginVersionId, pluginId);
    this.pools.set(pluginVersionId, {
      capabilities,
      bundleCode,
      limits: { ...DEFAULT_LIMITS, ...limits },
      sandboxes: [],
      waiters: [],
    });
  }

  private pluginIdByVersion = new Map<string, string>();

  isRegistered(pluginVersionId: string): boolean {
    return this.pools.has(pluginVersionId);
  }

  unregister(pluginVersionId: string): void {
    const pool = this.pools.get(pluginVersionId);
    if (!pool) return;
    for (const s of pool.sandboxes) s.dispose();
    this.pools.delete(pluginVersionId);
    this.pluginIdByVersion.delete(pluginVersionId);
  }

  private async borrow(pluginVersionId: string): Promise<Sandbox> {
    const pool = this.pools.get(pluginVersionId);
    if (!pool) throw new Error(`plugin version not registered: ${pluginVersionId}`);
    const free = pool.sandboxes.find((s) => !s.busy);
    if (free) { free.busy = true; return free; }
    if (pool.sandboxes.length < this.poolSize) {
      const pluginId = this.pluginIdByVersion.get(pluginVersionId)!;
      const s = await Sandbox.create(pluginId, pool.capabilities, pool.bundleCode, this.dispatch, pool.limits);
      s.busy = true;
      pool.sandboxes.push(s);
      return s;
    }
    return new Promise<Sandbox>((resolve) => pool.waiters.push(resolve));
  }

  private release(pluginVersionId: string, sandbox: Sandbox, broken: boolean): void {
    const pool = this.pools.get(pluginVersionId);
    if (!pool) { sandbox.dispose(); return; }
    if (broken) {
      sandbox.dispose();
      pool.sandboxes = pool.sandboxes.filter((s) => s !== sandbox);
      return;
    }
    const waiter = pool.waiters.shift();
    if (waiter) { waiter(sandbox); return; } // stays busy, handed to next
    sandbox.busy = false;
  }

  async runHttp(pluginVersionId: string, ctx: CallCtx, routeKey: string, reqJson: string): Promise<string> {
    const pool = this.pools.get(pluginVersionId);
    if (!pool) throw new Error(`plugin version not registered: ${pluginVersionId}`);
    const sandbox = await this.borrow(pluginVersionId);
    let broken = false;
    try {
      return await sandbox.runHttp(ctx, routeKey, reqJson, pool.limits.timeoutMs);
    } catch (e) {
      broken = true; // timeout / OOM / isolate fault → discard sandbox
      throw e;
    } finally {
      this.release(pluginVersionId, sandbox, broken);
    }
  }

  async runEvent(pluginVersionId: string, ctx: CallCtx, name: string, payloadJson: string): Promise<void> {
    const pool = this.pools.get(pluginVersionId);
    if (!pool) throw new Error(`plugin version not registered: ${pluginVersionId}`);
    const sandbox = await this.borrow(pluginVersionId);
    let broken = false;
    try {
      await sandbox.runEvent(ctx, name, payloadJson, pool.limits.timeoutMs);
    } catch (e) {
      broken = true;
      throw e;
    } finally {
      this.release(pluginVersionId, sandbox, broken);
    }
  }

  disposeAll(): void {
    for (const id of [...this.pools.keys()]) this.unregister(id);
  }
}
