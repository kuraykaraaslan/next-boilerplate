// Builds the in-isolate bootstrap script: the frozen `host.*` shim (generated from
// CAPABILITY_SURFACE) plus the __invoke{Http,Event,Provider} dispatch helpers. Pure
// string generation — no isolated-vm — so it's trivially testable.
import { CAPABILITY_SURFACE, type Capability } from '../../sdk/types';

export function buildBootstrap(pluginId: string, capabilities: Capability[]): string {
  // Every host.* method funnels through __hostCall (the one reference). args are
  // JSON-serialized; the result is parsed and { error } is rethrown.
  const call = (cap: string, method: string) =>
    `(...args) => __hostCall(JSON.stringify({ cap: ${JSON.stringify(cap)}, method: ${JSON.stringify(method)}, args }))` +
    `.then((r) => { const o = JSON.parse(r); if (o && o.error) throw new Error(o.error); return o.value; })`;

  // The host shim is generated from CAPABILITY_SURFACE — a new capability/method
  // there is auto-exposed as host.<cap>.<method>, no edit needed here.
  const objFor = (cap: Capability) =>
    `{ ${CAPABILITY_SURFACE[cap].map((m) => `${m}:${call(cap, m)}`).join(', ')} }`;
  const granted = capabilities
    .filter((c) => CAPABILITY_SURFACE[c])
    .map((c) => `  ${c}: ${objFor(c)},`)
    .join('\n');

  return `
    globalThis.host = Object.freeze({
      ctx: Object.freeze({ pluginId: ${JSON.stringify(pluginId)}, capabilities: Object.freeze(${JSON.stringify(capabilities)}) }),
${granted}
    });
    globalThis.__invokeHttp = async function (routeKey, reqJson) {
      const mod = globalThis.__plugin;
      // Exact "METHOD path" key first, then a '*' catch-all the plugin can route itself.
      const fn = mod && mod.http && (mod.http[routeKey] || mod.http['*']);
      if (typeof fn !== 'function') {
        return JSON.stringify({ status: 404, body: { error: 'no handler: ' + routeKey } });
      }
      const res = await fn(JSON.parse(reqJson), globalThis.host);
      return JSON.stringify(res || {});
    };
    globalThis.__invokeEvent = async function (name, payloadJson) {
      const mod = globalThis.__plugin;
      const fn = mod && mod.events && mod.events[name];
      if (typeof fn === 'function') await fn(JSON.parse(payloadJson), globalThis.host);
      return '{}';
    };
    globalThis.__invokeProvider = async function (point, op, payloadJson) {
      const mod = globalThis.__plugin;
      const fn = mod && mod.providers && mod.providers[point] && mod.providers[point][op];
      if (typeof fn !== 'function') throw new Error('no provider op: ' + point + '.' + op);
      const res = await fn(JSON.parse(payloadJson), globalThis.host);
      return JSON.stringify(res === undefined ? null : res);
    };
  `;
}
