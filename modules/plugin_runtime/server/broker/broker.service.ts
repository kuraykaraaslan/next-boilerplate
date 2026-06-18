// The internal capability broker — the ONLY tier with DB/storage credentials.
// The plugin-host (which holds no creds) forwards every `host.*` call here over
// RPC; this service re-enforces scoping it cannot trust the caller for and runs the
// real operation by reusing existing first-party services. It imports NO
// isolated-vm, so it never enters the web/Next bundle's untrusted path.
//
// Each capability lives in its own file under ./capabilities and is registered in
// the CAPABILITIES table below. Adding a capability = a new capability file + one
// entry here + one line in CAPABILITY_SURFACE (sdk/types) — nothing else.

import type { Capability, Json } from '../../sdk/types';
import { requireCap, type BrokerCtx } from './broker.context';
import { data } from './capabilities/data.capability';
import { settings } from './capabilities/settings.capability';
import { secrets } from './capabilities/secrets.capability';
import { http } from './capabilities/http.capability';
import { crypto } from './capabilities/crypto.capability';
import { saml } from './capabilities/saml.capability';
import { storage } from './capabilities/storage.capability';
import { events } from './capabilities/events.capability';

export type { BrokerCtx } from './broker.context';

// ── capability registry ──────────────────────────────────────────────────────
// method → impl(ctx, args). Keyed by `Capability`, so the type checker fails the
// build if a capability declared in CAPABILITY_SURFACE has no implementation here.
type CapMethod = (ctx: BrokerCtx, args: Json[]) => Promise<Json> | Json;

const CAPABILITIES: Record<Capability, Record<string, CapMethod>> = {
  data: {
    get: (c, a) => data.get(c, a[0] as string, a[1] as string),
    put: (c, a) => data.put(c, a[0] as string, a[1] as string, a[2] as Json),
    delete: (c, a) => data.delete(c, a[0] as string, a[1] as string),
    list: (c, a) => data.list(c, a[0] as string, a[1] as never),
  },
  http: {
    fetch: (c, a) => http.fetch(c, a[0] as string, a[1] as never),
  },
  settings: {
    get: (c, a) => settings.get(c, a[0] as string),
    getMany: (c, a) => settings.getMany(c, a[0] as string[]),
    set: (c, a) => settings.set(c, a[0] as string, a[1] as string),
  },
  secrets: {
    get: (c, a) => secrets.get(c, a[0] as string),
  },
  storage: {
    put: (c, a) => storage.put(c, a[0] as string, a[1] as never),
    getUrl: (c, a) => storage.getUrl(c, a[0] as string, a[1] as number),
    delete: (c, a) => storage.delete(c, a[0] as string),
  },
  events: {
    log: (c, a) => events.log(c, a[0] as never, a[1] as string, a[2] as Json),
    emit: (c, a) => events.emit(c, a[0] as string, a[1] as Json),
  },
  crypto: {
    verifyJwks: (c, a) => crypto.verifyJwks(c, a[0] as string, a[1] as string, a[2] as never),
    signJwt: (c, a) => crypto.signJwt(c, a[0] as never, a[1] as never),
    signData: (c, a) => crypto.signData(c, a[0] as string, a[1] as never),
    hmac: (c, a) => crypto.hmac(c, a[0] as string, a[1] as never),
  },
  saml: {
    generateAuthUrl: (c, a) => saml.generateAuthUrl(c, a[0] as string, a[1] as never),
    validateResponse: (c, a) => saml.validateResponse(c, a[0] as never, a[1] as never),
  },
};

/**
 * Single entry point the RPC layer calls. Validates the capability grant, then
 * routes to the registered method. Unknown capability/method → throws.
 */
export async function dispatch(ctx: BrokerCtx, capability: string, method: string, args: Json[]): Promise<Json> {
  const cap = CAPABILITIES[capability as Capability];
  if (!cap) throw new Error(`unknown capability: ${capability}`);
  requireCap(ctx, capability as Capability);
  const fn = cap[method];
  if (!fn) throw new Error(`unknown capability/method: ${capability}.${method}`);
  return fn(ctx, args ?? []);
}
