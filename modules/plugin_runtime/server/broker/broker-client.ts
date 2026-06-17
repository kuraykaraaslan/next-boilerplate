// Host-side capability dispatch (runs in the creds-less plugin-host). Forwards each
// `host.*` call from an isolate to the web-tier broker endpoint over token-auth HTTP.
// Holds ONLY the broker URL + token — never DB/storage credentials.

import type { HostDispatch } from '../host/isolate-pool';
import type { BrokerRequest, BrokerResult, RuntimeConfig } from '../rpc/protocol';

export function makeBrokerDispatch(cfg: RuntimeConfig): HostDispatch {
  return async (ctx, capability, method, args) => {
    const body: BrokerRequest = {
      tenantId: ctx.tenantId,
      pluginId: ctx.pluginId,
      capabilities: ctx.capabilities,
      httpAllowlist: ctx.httpAllowlist ?? [],
      limits: ctx.limits ?? { httpTimeoutMs: cfg.defaultLimits.httpTimeoutMs, httpMaxBytes: cfg.defaultLimits.httpMaxBytes },
      capability,
      method,
      args,
    };
    const res = await fetch(cfg.brokerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.brokerToken}` },
      body: JSON.stringify(body),
    });
    if (res.status === 401) throw new Error('broker auth failed');
    const json = (await res.json()) as BrokerResult;
    if ('error' in json) throw new Error(json.error);
    return json.value;
  };
}
