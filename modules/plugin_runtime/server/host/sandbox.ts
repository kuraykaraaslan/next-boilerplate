// A single V8 isolate running one plugin version's bundle. Handles ONE call at a
// time (the pool holds the borrow lock); per-call tenant context lives host-side in
// `_ctx`, set under the lock so the plugin can never read or spoof it.
import ivm from 'isolated-vm';
import type { Capability, Json } from '../../sdk/types';
import { buildBootstrap } from './isolate-bootstrap';
import type { CallCtx, HostDispatch, SandboxLimits } from './isolate.types';

export class Sandbox {
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

  /** Run a provider op (point#op). One call at a time (caller holds the borrow lock). */
  async runProvider(ctx: CallCtx, point: string, op: string, payloadJson: string, timeoutMs: number): Promise<string> {
    this._ctx = ctx;
    try {
      await this.context.global.set('__prov_point', point);
      await this.context.global.set('__prov_op', op);
      await this.context.global.set('__prov_payload', payloadJson);
      const script = await this.isolate.compileScript('__invokeProvider(__prov_point, __prov_op, __prov_payload)');
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
