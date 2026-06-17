// Web-tier client to the plugin-host. Sends a run request; if the host reports a
// cold cache (`needBundle`), lazily fetches the approved bundle and retries once.
// Safe to import from the Next/web tier — pulls in no isolated-vm.

import { loadRuntimeConfig, type RunRequest, type RunResult, type SandboxConfig } from './protocol';

async function post(url: string, token: string, body: RunRequest): Promise<RunResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    // Connection-level failure (host process not running / wrong PLUGIN_HOST_URL).
    const cause = e?.cause?.code ?? e?.cause?.message ?? e?.message ?? 'fetch failed';
    throw new Error(
      `plugin-host unreachable at ${url} (${cause}). Start it with \`npm run plugin-host:dev\` (or set PLUGIN_HOST_URL).`,
    );
  }
  if (res.status === 401) throw new Error('plugin-host auth failed');
  return (await res.json()) as RunResult;
}

export interface RunOnHostArgs {
  tenantId: string;
  sandbox: SandboxConfig;
  kind: 'http' | 'event' | 'provider';
  target: string;
  payloadJson: string;
  /** Loads the approved bundle code; called only on a host cache miss. */
  getBundle: () => Promise<string>;
}

/** Run a plugin handler on the host; returns the handler's JSON result string. */
export async function runOnHost(args: RunOnHostArgs): Promise<string> {
  const cfg = loadRuntimeConfig();
  const url = `${cfg.hostUrl}/run`;
  const base: RunRequest = {
    tenantId: args.tenantId,
    sandbox: args.sandbox,
    kind: args.kind,
    target: args.target,
    payloadJson: args.payloadJson,
  };
  let result = await post(url, cfg.hostToken, base);
  if (!result.ok && 'needBundle' in result && result.needBundle) {
    result = await post(url, cfg.hostToken, { ...base, bundleCode: await args.getBundle() });
  }
  if (result.ok) return result.resultJson;
  throw new Error(('error' in result && result.error) || 'plugin run failed');
}
