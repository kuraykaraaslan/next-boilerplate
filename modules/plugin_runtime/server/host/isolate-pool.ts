// The V8-isolate runtime for untrusted plugin code. Runs ONLY in the standalone
// plugin-host process (never imported by app/ or the broker — keeps the isolated-vm
// native addon out of the Next bundle and the broker tier).
//
// Isolation model: one Isolate per plugin VERSION (compiled bundle cached); a pool
// of warm sandboxes; each sandbox handles ONE call at a time (no shared mutable
// global races), concurrency = pool size. The Sandbox itself lives in ./sandbox;
// this file owns the per-version pool (borrow/release, recreate-on-fault).

import type { Capability } from '../../sdk/types';
import { Sandbox } from './sandbox';
import { DEFAULT_LIMITS, type CallCtx, type HostDispatch, type SandboxLimits } from './isolate.types';

export type { CallCtx, HostDispatch, SandboxLimits } from './isolate.types';

interface PoolEntry {
  capabilities: Capability[];
  bundleCode: string;
  limits: SandboxLimits;
  sandboxes: Sandbox[];
  waiters: Array<(s: Sandbox) => void>;
}

/**
 * Manages warm sandboxes per plugin version. `register` pins a version's bundle;
 * `runHttp`/`runProvider`/`runEvent` borrow a free sandbox (creating up to
 * `poolSize`), run, and return it. A crashed/timed-out sandbox is disposed and
 * recreated, never reused.
 */
export class SandboxManager {
  private readonly pools = new Map<string, PoolEntry>(); // key: pluginVersionId
  private pluginIdByVersion = new Map<string, string>();

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

  /** Borrow → run → release, disposing the sandbox on fault (timeout/OOM/isolate). */
  private async withSandbox<T>(pluginVersionId: string, run: (s: Sandbox, limits: SandboxLimits) => Promise<T>): Promise<T> {
    const pool = this.pools.get(pluginVersionId);
    if (!pool) throw new Error(`plugin version not registered: ${pluginVersionId}`);
    const sandbox = await this.borrow(pluginVersionId);
    let broken = false;
    try {
      return await run(sandbox, pool.limits);
    } catch (e) {
      broken = true;
      throw e;
    } finally {
      this.release(pluginVersionId, sandbox, broken);
    }
  }

  runHttp(pluginVersionId: string, ctx: CallCtx, routeKey: string, reqJson: string): Promise<string> {
    return this.withSandbox(pluginVersionId, (s, l) => s.runHttp(ctx, routeKey, reqJson, l.timeoutMs));
  }

  runProvider(pluginVersionId: string, ctx: CallCtx, point: string, op: string, payloadJson: string): Promise<string> {
    return this.withSandbox(pluginVersionId, (s, l) => s.runProvider(ctx, point, op, payloadJson, l.timeoutMs));
  }

  runEvent(pluginVersionId: string, ctx: CallCtx, name: string, payloadJson: string): Promise<void> {
    return this.withSandbox(pluginVersionId, (s, l) => s.runEvent(ctx, name, payloadJson, l.timeoutMs));
  }

  disposeAll(): void {
    for (const id of [...this.pools.keys()]) this.unregister(id);
  }
}
