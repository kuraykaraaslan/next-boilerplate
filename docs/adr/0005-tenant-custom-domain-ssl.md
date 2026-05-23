# ADR 0005 — Tenant custom-domain SSL via reverse-proxy on-demand TLS

**Status:** Accepted (2026-05)

## Context

Tenants need to bind their own apex / subdomain (e.g. `acme.com`, `support.acme.com`) and have HTTPS served from the platform. The naïve approach — speaking ACME from inside the Node process and writing cert files to disk — works but introduces:

- A second source of truth for cert state (filesystem vs DB).
- The need for HTTP-01 / TLS-ALPN-01 challenge handlers in the app routing layer.
- Cert renewal scheduling, rate-limit handling, OCSP stapling, etc., all of which already exist in mature reverse proxies.

## Decision

The application does **not** speak ACME. A reverse proxy (Caddy is the documented default — see [docs/caddy-on-demand-tls.md](../caddy-on-demand-tls.md)) terminates TLS and obtains certs via Let's Encrypt's on-demand mechanism. The application's responsibility shrinks to:

1. **Authorization** — `GET /internal/api/caddy-ask?domain=<host>` (Caddy's `on_demand_tls.ask` callback). Returns 200 iff the hostname is a `TenantDomain` row with `domainStatus IN ('ACTIVE', 'VERIFIED')`. Optionally Bearer-protected via `CADDY_ASK_SECRET`.

2. **Observability** — `SSLProvisioningService.recheckCertificates()` runs daily (cron `ssl-health`), opens a TLS handshake against every active domain, parses the leaf cert, and writes `sslStatus / sslIssuedAt / sslExpiresAt / sslIssuer / sslLastCheckedAt` back to the `TenantDomain` row. The admin UI in `/admin/domains` surfaces this state.

3. **No cert storage** — certs live in the reverse-proxy data directory (`/data` for Caddy). The app never writes PEM bytes.

The `/internal/api/*` URL space is reserved for endpoints the proxy needs to reach without a tenant context. `proxy.ts` short-circuits these requests so they are not rewritten under `/tenant/{tenantId}/`.

## Consequences

**Positive**
- The cert state is observable in the platform DB without owning the cert lifecycle. The admin sees "cert expires in 12 days, issued by Let's Encrypt Authority X3" without the app ever touching the private key.
- Let's Encrypt rate-limit protection is built in: a random client pointing DNS at us cannot trigger issuance because `caddy-ask` returns 404 unless `TenantDomain` row is verified.
- The reverse-proxy choice is operator-decided (Caddy / Traefik / cert-manager) — the contract is just an `ask` URL, easy to port.

**Negative**
- The `caddy-data` volume (or equivalent) is now a stateful piece of infrastructure that must survive deploys; losing it forces re-issuance of every cert and may hit Let's Encrypt rate limits.
- The app can't trigger an *immediate* cert renewal — that's the proxy's call. The admin UI shows `sslLastCheckedAt` so stale data is visible; manual `POST /api/cron/ssl-health` re-probes.
- Customers using Kubernetes-native ingress (Traefik IngressRoute, NGINX Ingress) need a different glue layer — documented in [docs/caddy-on-demand-tls.md](../caddy-on-demand-tls.md) but not implemented out-of-the-box.

## Alternatives considered

- **Mint certs in the Node process via acme-client / greenlock.** Rejected: re-implements what mature proxies already do, complicates the routing layer with `/.well-known/acme-challenge` handlers, and creates a cert filesystem the app must reload on rotation.
- **Per-tenant wildcard cert (DNS-01).** Rejected for general case — requires the platform to manage DNS for every customer apex. Useful for customers who delegate via CNAME under our wildcard hostname, recommended in the doc.
- **Cloudflare / Vercel-style automatic SAN.** Acceptable on those platforms and explicitly compatible — when running on Vercel/Cloudflare the `caddy-ask` route is unused and the platform's own automatic SSL takes over.
