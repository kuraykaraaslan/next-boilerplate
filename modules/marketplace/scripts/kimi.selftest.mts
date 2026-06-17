// Proves the @kimi/kimi third-party plugin runs through the provider runtime and
// that the API key never enters the isolate (signed egress). Run with:
//   npm run kimi:selftest
// Uses a stub broker (no real Moonshot call) so it is offline + deterministic.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SandboxManager } from '../../plugin_runtime/server/host/isolate-pool';
import type { CallCtx } from '../../plugin_runtime/server/host/isolate-pool';

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = readFileSync(path.join(here, '../examples/@kimi/kimi/plugin.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (n: string) => { console.log('PASS', n); pass++; };
const no = (n: string, d?: unknown) => { console.log('FAIL', n, JSON.stringify(d ?? '')); fail++; };

let sawAuthHeader: string | undefined;
let sawUrl: string | undefined;

// Stub broker: stands in for the web-tier broker. It does NOT substitute secrets
// (that is the real broker's job) — so whatever the isolate emitted is visible here.
const dispatch = async (_ctx: CallCtx, cap: string, method: string, args: unknown[]) => {
  if (cap === 'http' && method === 'fetch') {
    const [url, init] = args as [string, { headers?: Record<string, string> }];
    sawUrl = url;
    sawAuthHeader = init?.headers?.authorization;
    return {
      status: 200,
      headers: {},
      body: JSON.stringify({
        model: 'kimi-k2-0711-preview',
        choices: [{ message: { role: 'assistant', content: 'Merhaba! Ben Kimi.' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
  }
  return null;
};

const mgr = new SandboxManager(dispatch, 2);
mgr.register('kimi-v1', '@kimi/kimi', ['http', 'secrets'], bundle, { timeoutMs: 5000 });
const ctx: CallCtx = {
  tenantId: 'tnt-1', pluginId: '@kimi/kimi', capabilities: ['http', 'secrets'],
  httpAllowlist: ['api.moonshot.ai'], limits: { httpTimeoutMs: 5000, httpMaxBytes: 1_000_000 },
};

// chat
const chat = JSON.parse(await mgr.runProvider('kimi-v1', ctx, 'ai:provider', 'chat',
  JSON.stringify({ systemPrompt: 'Be brief', messages: [{ role: 'user', content: 'selam' }] })));
chat.content === 'Merhaba! Ben Kimi.' ? ok('chat-content') : no('chat-content', chat);
(chat.provider === 'kimi' && chat.usage?.totalTokens === 15) ? ok('chat-mapping') : no('chat-mapping', chat);
sawUrl === 'https://api.moonshot.ai/v1/chat/completions' ? ok('egress-url') : no('egress-url', sawUrl);

// SIGNED EGRESS: the isolate must have emitted the placeholder, never a real key.
sawAuthHeader === 'Bearer {{secret:apiKey}}' ? ok('signed-egress-key-not-in-isolate') : no('signed-egress-key-not-in-isolate', sawAuthHeader);

// listModels
const models = JSON.parse(await mgr.runProvider('kimi-v1', ctx, 'ai:provider', 'listModels', '{}'));
(Array.isArray(models) && models.includes('kimi-k2-0711-preview')) ? ok('list-models') : no('list-models', models);

mgr.disposeAll();
console.log(`\nRESULT ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
