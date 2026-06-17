// Standalone plugin-host process — runs untrusted plugin code in V8 isolates,
// SEPARATE from the Next/backend tier so an OOM/crash here never takes down the app.
//
// IMPORTANT: this process holds NO db/storage credentials. It reaches data only via
// the web-tier broker (over token-auth HTTP, see broker-client). Start it with
// `--no-node-snapshot` (required by isolated-vm on modern Node) — the npm scripts do.
//
//   npm run plugin-host:dev   |   npm run plugin-host:start

import http from 'node:http';
import { SandboxManager, type CallCtx } from './host/isolate-pool';
import { makeBrokerDispatch } from './broker/broker-client';
import { loadRuntimeConfig, tokensMatch, type RunRequest, type RunResult } from './rpc/protocol';

const cfg = loadRuntimeConfig();
const mgr = new SandboxManager(makeBrokerDispatch(cfg), Number(process.env.PLUGIN_POOL_SIZE ?? 2));
const log = (...a: unknown[]) => console.log('[plugin-host]', ...a);

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 16_000_000) { reject(new Error('body too large')); req.destroy(); } data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleRun(body: RunRequest): Promise<RunResult> {
  const { sandbox } = body;
  if (!mgr.isRegistered(sandbox.pluginVersionId)) {
    if (!body.bundleCode) return { ok: false, needBundle: true };
    mgr.register(sandbox.pluginVersionId, sandbox.pluginId, sandbox.capabilities, body.bundleCode, {
      memoryMb: sandbox.limits.memoryMb,
      timeoutMs: sandbox.limits.timeoutMs,
    });
  }
  const ctx: CallCtx = {
    tenantId: body.tenantId,
    pluginId: sandbox.pluginId,
    capabilities: sandbox.capabilities,
    httpAllowlist: sandbox.httpAllowlist,
    limits: { httpTimeoutMs: sandbox.limits.httpTimeoutMs, httpMaxBytes: sandbox.limits.httpMaxBytes },
  };
  try {
    const resultJson = body.kind === 'http'
      ? await mgr.runHttp(sandbox.pluginVersionId, ctx, body.target, body.payloadJson)
      : (await mgr.runEvent(sandbox.pluginVersionId, ctx, body.target, body.payloadJson), '{}');
    return { ok: true, resultJson };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'plugin execution failed' };
  }
}

const server = http.createServer(async (req, res) => {
  const json = (status: number, obj: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  try {
    if (req.method === 'GET' && req.url === '/healthz') return json(200, { status: 'alive' });
    if (req.method === 'POST' && req.url === '/run') {
      const auth = (req.headers.authorization ?? '').replace(/^Bearer /, '');
      if (!tokensMatch(auth, cfg.hostToken)) return json(401, { ok: false, error: 'unauthorized' });
      const body = JSON.parse(await readBody(req)) as RunRequest;
      return json(200, await handleRun(body));
    }
    json(404, { ok: false, error: 'not found' });
  } catch (e: any) {
    json(400, { ok: false, error: e?.message ?? 'bad request' });
  }
});

server.listen(cfg.hostPort, () => log(`listening on :${cfg.hostPort} (pool=${process.env.PLUGIN_POOL_SIZE ?? 2})`));

function shutdown() { log('shutting down'); mgr.disposeAll(); server.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
