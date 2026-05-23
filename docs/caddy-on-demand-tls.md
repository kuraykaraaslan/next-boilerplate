# Caddy on-demand TLS for tenant custom domains

This boilerplate does **not** mint TLS certificates in the Node process. A reverse proxy (Caddy, Traefik, cert-manager, …) terminates TLS and obtains certs from Let's Encrypt via ACME. The application's job is to tell the proxy *which* hostnames are allowed to provision a cert — so a random stranger pointing DNS at our server can't trigger unbounded Let's Encrypt issuance and hit the rate limit.

## Caddy

Caddy's [on-demand TLS](https://caddyserver.com/docs/automatic-https#on-demand-tls) directive provisions certs at first TLS handshake — but only if the operator has whitelisted the hostname via an `ask` endpoint. We implement that endpoint at:

```
GET /internal/api/caddy-ask?domain=<hostname>
```

Returns HTTP 200 iff `<hostname>` is a row in `TenantDomain` with `domainStatus IN ('ACTIVE', 'VERIFIED')`. Anything else returns 4xx. Side effect: a successful authorization flips `sslStatus` from `DISABLED` → `PENDING` so the admin UI shows progress.

### Minimal Caddyfile

```caddyfile
{
    # Global on-demand TLS config — the ask URL must return 200 before
    # Caddy will attempt ACME for any unknown hostname.
    on_demand_tls {
        ask http://app:3000/internal/api/caddy-ask
    }
}

# Catch-all virtual host that matches any verified tenant domain.
:443 {
    tls {
        on_demand
    }
    reverse_proxy app:3000
}
```

If you prefer Bearer auth on the ask endpoint (recommended in production so only Caddy can hit it), set `CADDY_ASK_SECRET` in the app env and add the header in Caddy's `ask` block:

```caddyfile
on_demand_tls {
    ask http://app:3000/internal/api/caddy-ask {
        headers {
            Authorization "Bearer {env.CADDY_ASK_SECRET}"
        }
    }
}
```

### docker-compose snippet

```yaml
services:
  app:
    image: your-boilerplate:latest
    environment:
      CADDY_ASK_SECRET: ${CADDY_ASK_SECRET}
      CRON_SECRET:      ${CRON_SECRET}
    expose: ["3000"]

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    environment:
      CADDY_ASK_SECRET: ${CADDY_ASK_SECRET}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
    depends_on: [app]

volumes:
  caddy-data:
```

The `caddy-data` volume **must** survive container restarts — it holds the issued certs and the ACME account key.

## Traefik

Traefik does not have a built-in equivalent of Caddy's `ask` callback. The closest pattern is to register tenant domains via the docker provider or the file provider, gated by a sidecar that watches `TenantDomain` changes and updates Traefik's dynamic config. That's outside the scope of this boilerplate; if you're on Traefik, prefer wildcard certs (one cert covering `*.yourplatform.com`) and refuse arbitrary customer hostnames.

## cert-manager (Kubernetes)

In a k8s deployment, each `TenantDomain` row should map to a `Certificate` resource. A small operator can reconcile that, but the simpler pattern is to point every tenant at a single ingress that holds a wildcard cert. Custom apex domains (`acme.com` not `acme.yourplatform.com`) still need per-domain certs.

## What the app does

| When | What |
|---|---|
| Admin adds custom domain | `TenantDomain` row created, `domainStatus = 'PENDING'`, DNS verification token issued |
| Admin completes DNS proof | `domainStatus = 'VERIFIED'`, `verifiedAt = now()` |
| First TLS handshake to that domain | Caddy hits `/internal/api/caddy-ask` → 200, then performs HTTP-01 / TLS-ALPN-01 ACME challenge against Let's Encrypt. Cert issued. App flips `sslStatus = 'PENDING'` |
| Daily `ssl-health` cron | TLS-probes every active domain, parses cert, writes `sslStatus / sslIssuedAt / sslExpiresAt / sslIssuer / sslLastCheckedAt`. Cert expiring within 30 days → `EXPIRING`; expired → `EXPIRED` |
| 6-hourly `tenant-domain-dns-recheck` cron | TXT/CNAME health check; broken DNS → `domainStatus = 'DNS_FAILED'` (admin must re-verify) |

## Rate limits

Let's Encrypt enforces a [rate limit](https://letsencrypt.org/docs/rate-limits/) of **50 certs per registered domain per week** at the apex. If a single tenant adds 50+ subdomains in one week against the same apex, ACME will throttle. Caddy retries with backoff but the cert won't be issued until the window resets — the `sslStatus` will stick at `PENDING` / `PROVISIONING`. Plan accordingly: if you expect customers to bring many subdomains, recommend they delegate via CNAME to a single hostname under your wildcard cert instead.
