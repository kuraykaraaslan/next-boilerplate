# Isolated Plugin Authoring API

How to build a sandboxed community plugin: the bundle contract, the host capability
API, the manifest schema, the contribution points, and the HTTP endpoints. Everything
here reflects the live runtime (`modules/plugin_runtime` + `modules/marketplace`).

## Architecture (3 tiers)

```
browser ──HTTP──► web/dispatch tier ──RPC──► plugin-host (V8 isolate, NO creds)
                        │                          │
                        │                    host.<cap>.<method>()
                        ▼                          ▼
                  resolve + sanitize      POST /internal/api/plugin-broker
                                                   │  (Bearer brokerToken)
                                                   ▼
                                          broker tier (HOLDS creds: DB/http/secrets)
```

- Your plugin is an **untrusted bundle** running in a V8 isolate (`isolated-vm`) in a
  **separate plugin-host process** (`:4500`). No `process`, `fs`, `require`, `fetch`,
  module system, `Date`-based determinism aside.
- It reaches the outside world **only** through the frozen `host` object. Each `host.*`
  call is forwarded over RPC to the **broker**, which re-enforces scope and runs the
  real operation with credentials the isolate never sees.
- Trust-critical work (JWKS/id_token verification, SAML XML-DSig, signing with private
  keys, secret substitution) happens **host-side in the broker**, never in your bundle.

## Anatomy of a plugin

A plugin is a directory with two files:

```
@<scope>/<name>/
  manifest.json   # identity + sandbox grants + config schema + contributions
  plugin.js       # the bundle: assigns globalThis.__plugin = { ... }
```

### `manifest.json`

```jsonc
{
  "id": "stripe",                       // stable key (lowercased extension key)
  "name": "Stripe Gateway",
  "version": "1.0.0",
  "description": "…",
  "icon": "fab fa-stripe",              // FontAwesome class

  "sandbox": {
    "runtime": "isolated",
    "capabilities": ["http", "settings"],          // ONLY these host.* are present
    "httpAllowlist": ["api.stripe.com"],           // host.http.fetch is limited to these hosts
    "limits": { "memoryMb": 64, "timeoutMs": 30000, "httpTimeoutMs": 28000, "httpMaxBytes": 2000000 }
  },

  "config": {                            // admin-set per-tenant config (generic config endpoint)
    "secrets":  [{ "key": "stripeSecretKey", "label": "Secret Key", "help": "…" }],   // encrypted, write-only
    "settings": [{ "key": "stripePublishableKey", "label": "Publishable Key" }]       // plaintext
  },

  "extensions": [                        // what host extension points this plugin contributes to
    { "point": "payment:gateway", "key": "stripe", "metadata": { "label": "Stripe", "ops": ["createCheckoutSession", …] } }
  ]
}
```

### `plugin.js` (the bundle)

The bundle assigns a `PluginModule` to `globalThis.__plugin`. Three kinds of entry point
(mix as needed):

```js
globalThis.__plugin = {
  // 1) Provider op-sets — contribute typed operations into a host extension point.
  providers: {
    'payment:gateway': {
      createCheckoutSession: async (input, host) => { /* return JSON */ },
      getPaymentStatus:      async (input, host) => { /* return JSON */ },
    },
  },

  // 2) HTTP handlers — your own REST surface under /api/plugins/<id>/…
  http: {
    'GET things/:id': async (req, host) => ({ status: 200, body: { id: req.path } }),
  },

  // 3) Event handlers + one-time register hook.
  events:   { 'order.created': async (payload, host) => { /* … */ } },
  register: async (host) => { /* optional warm-up */ },
};
```

All op/handler inputs and outputs **must be JSON-serializable** (they cross the isolate
boundary). Each receives the bound `host` as the last argument.

## Host capability API

Only capabilities listed in `sandbox.capabilities` are present on `host` (others are
absent → accessing throws). Single source of truth: `sdk/types.ts` → `CAPABILITY_SURFACE`.

| Capability  | Methods | Notes |
|-------------|---------|-------|
| `data`      | `get(collection, key)` · `put(collection, key, value)` · `delete(collection, key)` · `list(collection, {prefix?, limit?, offset?, withValues?})` | KV/doc store auto-namespaced to `(tenant, plugin)`. No SQL. |
| `http`      | `fetch(url, { method?, headers?, body?, timeoutMs?, basic? })` → `{ status, headers, body }` | SSRF-guarded; restricted to `httpAllowlist`. See secret injection below. |
| `settings`  | `get(key)` · `getMany(keys)` · `set(key, value)` | Plugin-namespaced plaintext config. |
| `secrets`   | `get(key)` | Read-only decrypted secret (host-side decrypt). |
| `storage`   | `put(path, { base64, contentType? })` · `getUrl(path, expiresSeconds?)` · `delete(path)` | Blob storage under `plugins/<id>/`. |
| `events`    | `log(level, message, meta?)` · `emit(event, payload)` | `level`: `'info'|'warn'|'error'`. |
| `crypto`    | `verifyJwks(token, jwksUri, { issuer?, audience?, nonce? })` · `signJwt(claims, { algorithm?, keyid?, secretName?, expiresInSec? })` · `signData(data, { algorithm?, secretName? })` | Verification + signing done host-side; private keys stay in broker. `signJwt` default ES256; `signData` default RSA-SHA256 → base64. |
| `saml`      | `generateAuthUrl(...)` · `validateResponse(...)` | SP keys never enter the isolate. |

Every method is `async` (it crosses isolate→broker).

### Secret injection (never read secrets into the isolate)

Two ways to use a configured secret **without it entering your bundle**:

1. **Placeholder substitution** — put `{{secret:NAME}}` in an `http.fetch` URL, header,
   or body. The broker substitutes the decrypted secret host-side, then re-validates the
   final URL against the allowlist + SSRF guard:
   ```js
   await host.http.fetch(API, { headers: { authorization: 'Bearer {{secret:stripeSecretKey}}' } });
   ```
2. **Basic auth helper** — `init.basic = { username, secretName }`; the broker builds
   `Authorization: Basic base64(username:secret)` host-side:
   ```js
   await host.http.fetch(url, { method: 'POST', body: 'grant_type=client_credentials',
     basic: { username: clientId, secretName: 'paypalClientSecret' } });
   ```

`host.secrets.get('NAME')` *does* return the plaintext into the isolate — only use it
when the value must be inspected, and only with the `secrets` capability granted.

## Contribution (extension) points

`providers['<point>']` plugs a JSON op-set into a host extension point. The host resolves
a community contribution **before** the built-in (per-tenant). Current points:

| Point | Op-set the bundle implements | Resolved by |
|-------|------------------------------|-------------|
| `ai:provider`        | `listModels`, `chat`, `embed?` | `IsolatedAIProvider` |
| `auth_sso:provider`  | `getTokens`, `getUserInfo` (authorize URL built host-side) | `IsolatedSsoProvider` |
| `auth_acs:provider`  | protocol ops (oidc/saml) | `IsolatedAcsProvider` |
| `payment:gateway`    | `createCheckoutSession`, `getPaymentStatus`, `createPayment?`, `create3dsPayment?`, `createCustomerPortalSession?`, `createPaymentIntent?` | `IsolatedPaymentProvider` |
| `external:contributions` | generic `{ key, metadata, invoke }` | `listExternalContributions(tenantId, point)` |

`metadata` in the manifest extension entry is passed to the facade (capability flags,
profile maps, op allowlists). An op the bundle doesn't declare falls back to the host's
default behavior.

## HTTP endpoints

### Lifecycle — admin (`requiredTenantRole: 'ADMIN'`)

| Method | Path | Body / Result |
|--------|------|---------------|
| `GET`  | `/tenant/{tenantId}/api/marketplace/community` | installed + available community plugins |
| `PUT`  | `/tenant/{tenantId}/api/marketplace/community/{listingId}` | `{ action: 'install' \| 'activate' \| 'deactivate' \| 'uninstall' }` |
| `GET`  | `/tenant/{tenantId}/api/marketplace/plugins/{listingId}/config` | `{ success, config }` — declared settings/secrets + values (secrets as set-status only) |
| `PUT`  | `/tenant/{tenantId}/api/marketplace/plugins/{listingId}/config` | `{ settings?: {…}, secrets?: {…} }` → writes declared keys (secrets encrypted) |

### Runtime — any tenant member (`USER`)

```
GET|POST|PUT|PATCH|DELETE  /tenant/{tenantId}/api/plugins/{listingId}/{...path}
```

Routes to your `http` handlers. The isolate receives a **sanitized** request (never the
raw NextRequest / cookies / auth header):

```ts
// PluginRequest handed to your handler
{ method, path /* after …/plugins/<id>/ */, query: {…}, headers /* content-type, accept, accept-language, user-agent only */, body }
```

Your handler returns `{ status?, headers?, body? }`; the route replies with `body` at
`status` (default 200). Plugin execution failure → `502`; not installed → `404`.

### Internal — host→broker only (NOT for plugin authors)

```
POST /internal/api/plugin-broker        Authorization: Bearer <brokerToken>
body: { tenantId, pluginId, capabilities, httpAllowlist, limits, capability, method, args }
```

Loopback/private only. Your bundle never calls this — `host.*` does, transparently.

## Local dev workflow

1. Create `modules/marketplace/examples/@<scope>/<name>/{manifest.json,plugin.js}`.
2. `npm run seed:plugins` — publishes + installs every example into the dev tenant
   (`TARGET_TENANT_ID`), migrating known legacy setting keys.
3. `npm run plugin-host:dev` — starts the isolate host on `:4500` (required for any
   `host.*` call / runtime dispatch).
4. `npm run plugin:selftest` — exercises the broker capabilities end-to-end.
5. Configure secrets/settings via the config `PUT` endpoint (or the admin Plugins UI).

## Minimal complete example

`manifest.json`:
```json
{
  "id": "echo", "name": "Echo", "version": "1.0.0", "icon": "fas fa-bolt",
  "sandbox": { "runtime": "isolated", "capabilities": ["data"], "httpAllowlist": [],
    "limits": { "memoryMb": 64, "timeoutMs": 15000, "httpTimeoutMs": 14000, "httpMaxBytes": 1000000 } },
  "config": { "secrets": [], "settings": [] },
  "extensions": []
}
```

`plugin.js`:
```js
globalThis.__plugin = {
  http: {
    'POST notes': async (req, host) => {
      const id = 'n_' + Date.now();
      await host.data.put('notes', id, req.body);
      return { status: 201, body: { id } };
    },
    'GET notes/:id': async (req, host) => {
      const id = req.path.split('/')[1];
      return { status: 200, body: await host.data.get('notes', id) };
    },
  },
};
```

Call it: `POST /tenant/{tenantId}/api/plugins/echo/notes` → `{ "id": "n_…" }`.
