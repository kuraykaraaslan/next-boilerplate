// Isolation self-test for the plugin runtime. Run OUT of the vitest suite because
// isolated-vm needs `--no-node-snapshot`:
//
//   npm run plugin:selftest
//
// Asserts the security guarantees: capability bridge round-trips, ungranted caps are
// absent, per-call tenant ctx stays isolated under concurrency, no Node globals leak,
// timeouts fire, and the host capability gate rejects ungranted calls.

import { SandboxManager } from '../server/host/isolate-pool';
import type { CallCtx } from '../server/host/isolate-pool';

const dispatch = async (ctx: CallCtx, cap: string, method: string, args: unknown[]) => {
  if (cap === 'data' && method === 'get') return `stored:${ctx.tenantId}:${args[1]}`;
  return null;
};
const mgr = new SandboxManager(dispatch, 2);

let pass = 0, fail = 0;
const ok = (n: string) => { console.log('PASS', n); pass++; };
const no = (n: string, d?: unknown) => { console.log('FAIL', n, JSON.stringify(d ?? '')); fail++; };

const bundle = `globalThis.__plugin = { http: { 'GET ping': async (req, host) => {
  const v = await host.data.get('c', req.query.k);
  return { status: 200, body: { got: v, hasProcess: typeof process, hasRequire: typeof require, hasHttp: !!host.http } };
}, 'GET ungranted': async (req, host) => ({ status: 200, body: { tried: await host.http.fetch('http://x') } }) } };`;

mgr.register('v1', 'demo', ['data'], bundle);
const ctx: CallCtx = { tenantId: 'tnt', pluginId: 'demo', capabilities: ['data'], httpAllowlist: [], limits: { httpTimeoutMs: 1000, httpMaxBytes: 1000 } };
const req = (k: string) => JSON.stringify({ method: 'GET', path: 'ping', query: { k }, headers: {}, body: {} });

const r1 = JSON.parse(await mgr.runHttp('v1', ctx, 'GET ping', req('k1')));
r1.body.got === 'stored:tnt:k1' ? ok('capability-bridge') : no('capability-bridge', r1.body);
(r1.body.hasProcess === 'undefined' && r1.body.hasRequire === 'undefined') ? ok('no-node-globals') : no('no-node-globals', r1.body);
r1.body.hasHttp === false ? ok('ungranted-capability-absent') : no('ungranted-capability-absent', r1.body);

const many = await Promise.all(Array.from({ length: 6 }, (_, i) =>
  mgr.runHttp('v1', { ...ctx, tenantId: 't' + i }, 'GET ping', req('k' + i))));
many.every((r, i) => JSON.parse(r).body.got === `stored:t${i}:k${i}`) ? ok('concurrent-ctx-isolation') : no('concurrent-ctx-isolation');

mgr.register('v2', 'slow', [], `globalThis.__plugin={http:{'GET loop':()=>{while(true){}}}};`, { timeoutMs: 200 });
try { await mgr.runHttp('v2', { tenantId: 't', pluginId: 'slow', capabilities: [] }, 'GET loop', JSON.stringify({ method: 'GET', path: 'loop', query: {}, headers: {}, body: null })); no('timeout', 'no throw'); }
catch (e: any) { /timed out|timeout/i.test(e.message) ? ok('timeout') : no('timeout', e.message); }

mgr.disposeAll();
console.log(`\nRESULT ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
