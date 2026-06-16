# Tenant Domain

- **id:** `tenant_domain`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_domain/`
- **tags:** tenant, domain, infrastructure
- **icon:** `fas fa-globe`
- **hasNextLayer:** false

Custom domain mapping per tenant + DNS verification (TXT/CNAME challenge).

## Dependencies

- **requires:** `db`, `tenant`, `env`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/domains`
- `tenant` GET/DELETE `/tenant/[tenantId]/api/domains/[domainId]`
- `tenant` POST `/tenant/[tenantId]/api/domains/[domainId]/verify`

## TypeORM entities

- `TenantDomain` (tenant) — `modules/tenant_domain/server/entities/tenant_domain.entity.ts`

## README

# Tenant Domain Module

Custom domain / subdomain management for tenants: DNS-token verification (TXT or CNAME), primary-domain selection, per-tenant domain/subdomain caps, and SSL/TLS observability for certs minted by an external reverse proxy. Domain rows are Redis-cached and live in the per-tenant DB.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `TenantDomain` | `tenant_domains` | One custom domain/subdomain per row, with verification + SSL/TLS observability columns |

Lives in the **tenant DB** (rows isolated by `tenantId` via the per-tenant DataSource). The `domain` column is globally unique; lookups by `tenantDomainId` / `domain` go through `getDataSource()` (system DB) for cross-tenant resolution, while writes use `tenantDataSourceFor(tenantId)`.

Columns of note:

- `domainStatus` — `PENDING` → `VERIFIED` → `ACTIVE` (or `INACTIVE` / `DNS_FAILED`)
- `verificationToken`, `verifiedAt` — DNS-proof bookkeeping (`verificationToken` is stripped from API responses via `SafeTenantDomain`)
- `sslStatus`, `sslIssuedAt`, `sslExpiresAt`, `sslIssuer`, `sslLastCheckedAt` — TLS observability written by the SSL cron

---

## Services

| Service | Responsibility |
|---|---|
| `tenant_domain.service.ts` (`TenantDomainService`) | CRUD + lifecycle: `getByTenantId`, `getById`, `getByDomain`, `getPrimaryByTenantId`, `create`, `update`, `getVerificationInfo`, `initiateVerification`, `verifyDomain`, `delete`. Enforces per-tenant caps, single-primary invariant, and Redis cache invalidation. |
| `dns_verification.service.ts` (`DNSVerificationService`) | Token generation, TXT/CNAME record name/value helpers, Redis storage of the pending token (24h TTL), DNS resolution + verification, and `recheckActiveDomains()` (cron health-check). |
| `ssl_provisioning.service.ts` (`SSLProvisioningService`) | TLS observability. `isProvisioningAllowed(host)` is the Caddy `on_demand_tls.ask` gate; `probeCertificate(host)` opens a TLS handshake and parses the leaf cert; `recheckCertificates()` reconciles the `ssl*` columns (cron). The platform does **not** issue certs itself — a reverse proxy (Caddy/Traefik/cert-manager) does, via ACME/Let's Encrypt. |

---

## Domain Status

| Status | Meaning |
|---|---|
| `PENDING` | Added, awaiting DNS verification |
| `VERIFIED` | DNS check passed |
| `ACTIVE` | Verified and serving traffic |
| `INACTIVE` | Manually disabled |
| `DNS_FAILED` | A periodic recheck found the TXT/CNAME no longer resolves; admin must re-verify |

---

## SSL Status

Lifecycle written by `SSLProvisioningService` (the cert itself is provisioned externally):

`DISABLED` → `PENDING` → `PROVISIONING` → `ACTIVE` → `EXPIRING` → (`EXPIRED` / `FAILED`)

A successful `isProvisioningAllowed` flips `DISABLED → PENDING`; `recheckCertificates` promotes to `ACTIVE`, downgrades to `EXPIRING` within 30 days of expiry, or `FAILED` on handshake error / past expiry.

---

## Verification Methods

| Method | DNS record to add | Resolves to |
|---|---|---|
| `TXT` | `_verification.<domain>` → `TXT` | `verify=<token>` |
| `CNAME` | `_verify-<token>.<domain>` → `CNAME` | `VERIFICATION_DOMAIN` (`env`, defaults to `verify.example.com`) |

The pending token is stored in Redis (`dns_verify:<tenantDomainId>`, 24h TTL) and deleted once verification succeeds.

---

## Usage

```typescript
import TenantDomainService from '@/modules/tenant_domain/tenant_domain.service';

// Add a domain (status starts at PENDING)
const domain = await TenantDomainService.create({
  tenantId,
  domain: 'app.acme.com',
  isPrimary: false,
});

// Get the DNS record the user must add (defaults to TXT)
const info = await TenantDomainService.getVerificationInfo(domain.tenantDomainId);
// info.recordName / info.recordValue — show these to the user

// Re-check DNS and promote to VERIFIED
await TenantDomainService.verifyDomain(domain.tenantDomainId);

// Make it the primary domain (un-sets the previous primary for this tenant)
await TenantDomainService.update(domain.tenantDomainId, { isPrimary: true });
```

---

## API Routes

Tenant-scoped, **ADMIN+** (`requiredTenantRole: "ADMIN"`):

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/domains` | List domains (paginated) |
| POST | `/tenant/[tenantId]/api/domains` | Create a domain |
| GET | `/tenant/[tenantId]/api/domains/[domainId]` | Get verification info for a domain |
| DELETE | `/tenant/[tenantId]/api/domains/[domainId]` | Delete a domain (primary cannot be deleted) |
| POST | `/tenant/[tenantId]/api/domains/[domainId]/verify` | Run DNS verification |

Domain/subdomain limits are enforced in `TenantDomainService.create` from the per-tenant `maxDomains` / `maxSubdomains` settings (see *Settings*).

### Internal / cron routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/internal/api/caddy-ask` | internal | Caddy `on_demand_tls.ask` gate → `isProvisioningAllowed` |
| POST | `/tenant/[tenantId]/api/cron/dns-recheck` | Bearer `CRON_SECRET` | Run `recheckActiveDomains` |
| POST | `/tenant/[tenantId]/api/cron/ssl-health` | Bearer `CRON_SECRET` | Run `recheckCertificates` |

---

## Jobs

| Job | Queue | Default cadence | Runs |
|---|---|---|---|
| `tenant_domain.job.ts` | `tenant-domain-dns-recheck` | `0 */6 * * *` (every 6h) | `DNSVerificationService.recheckActiveDomains` — downgrades broken ACTIVE domains to `DNS_FAILED` |
| `ssl_health.job.ts` | `tenant-domain-ssl-health` | `15 5 * * *` (daily 05:15) | `SSLProvisioningService.recheckCertificates` — reconciles `ssl*` columns |

Both run on a single shared BullMQ worker (`concurrency: 1`). Trigger via `scheduleDnsRecheckJob()` / `scheduleSslHealthJob()` at boot (self-hosted) or the `CRON_SECRET`-protected cron routes above (serverless).

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/domains/settings` (gear button in the Domains page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `tenant_domain.settings.fields.ts`.

| Key | Type | Default | Notes |
|---|---|---|---|
| `maxDomains` | number | `3` | Max custom (non-wildcard) domains. Read per-tenant via `SettingService.getByKey(tenantId, 'maxDomains')`; hardcoded fallback of 3 when unset. |
| `maxSubdomains` | number | `1` | Max wildcard subdomains (ending in `TENANT_WILDCARD_DOMAIN`). Read per-tenant via `SettingService.getByKey(tenantId, 'maxSubdomains')`; hardcoded fallback of 1 when unset. |

Both are read in `TenantDomainService.create` before insert. Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.

---

## Security

- API responses use `SafeTenantDomain`, which **omits `verificationToken`** — the pending DNS token is never returned via the listing/detail endpoints.
- `isProvisioningAllowed` rejects IP literals, `localhost`/`*.localhost`, and any domain that is not `VERIFIED`/`ACTIVE`, keeping ACME (Let's Encrypt) rate-limits safe: a stranger pointing DNS at the platform cannot trigger unbounded cert issuance.
- TLS probes use `rejectUnauthorized: true` — an untrusted/expired cert is reported as `FAILED`, not silently accepted.
- Cron routes are gated by a Bearer token matching `env.CRON_SECRET`; the endpoint is disabled when the secret is unset.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages tenant custom domains/subdomains (DNS-token verification, SSL/TLS observability, primary-domain selection); strongly tenant-scoped — each tenant owns its domain rows in its own DB and configures its own domain/subdomain caps.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `maxDomains` | number | `3` | tenant | Maximum number of custom (non-wildcard) domains a tenant may register; enforced in create() before insert. Falls back to hardcoded 3 when unset. | `tenant_domain.service.ts` |
| `maxSubdomains` | number | `1` | tenant | Maximum number of wildcard subdomains (domains ending in TENANT_WILDCARD_DOMAIN) a tenant may register; enforced in create(). Falls back to hardcoded 1 when unset. | `tenant_domain.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `TenantDomain` | `tenant_domains` | domain, isPrimary, domainStatus, verificationToken, verifiedAt, sslStatus, sslIssuedAt, sslExpiresAt, sslIssuer, sslLastCheckedAt |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `tenant_domain.service.ts:create` — Domain vs subdomain caps are enforced per tenant: counts existing rows for data.tenantId and rejects if >= the tenant's own maxDomains/maxSubdomains setting (or the 3/1 fallback). Setting a domain isPrimary also unsets the prior primary within that tenant only.
- `ssl_provisioning.service.ts:isProvisioningAllowed` — On-demand TLS issuance is authorized per hostname only when that domain belongs to a tenant and is VERIFIED/ACTIVE; flips that tenant's domain sslStatus DISABLED->PENDING. Effectively gates cert minting per tenant domain state.
- `dns_verification.service.ts:recheckActiveDomains` — Cron re-resolves each ACTIVE domain and, on failure, downgrades that specific tenant's row to DNS_FAILED and writes a per-tenant audit log (tenantId=d.tenantId) via tenantDataSourceFor(d.tenantId).

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Hardcoded fallback caps of 3 custom domains and 1 subdomain when the tenant has no maxDomains/maxSubdomains setting row | `tenant_domain.service.ts:create` | The fallbacks (parseInt fallback to 3 and 1) are global constants applied to every tenant lacking an explicit override. The per-tenant keys already exist, but the DEFAULT itself is hardcoded rather than read from a platform/root default setting, so plans can't change the baseline without code edits. | `defaultMaxDomains` |
| CNAME verification target domain and TXT/CNAME record prefixes (CNAME_TARGET_DOMAIN from env.VERIFICATION_DOMAIN, _verification/_verify prefixes) | `dns_verification.service.ts:CNAME_TARGET_DOMAIN` | Global via env var and module constants — same verification endpoint for all tenants. Intentionally global shared verification infrastructure; would only need to be per-tenant for white-label DNS instructions, which is not a current requirement. | — |
| SSL recheck windows and DNS/SSL cron cadences (EXPIRING_WINDOW_DAYS=30, RECHECK_CONCURRENCY=5, ssl '15 5 * * *', dns '0 */6 * * *') | `ssl_provisioning.service.ts:EXPIRING_WINDOW_DAYS` | Hardcoded platform-wide constants run by a single shared worker (concurrency 1). Intentionally global shared infra/worker pool — not meaningfully a per-tenant concern. | — |

---

## Dependencies

`db`, `tenant`, `env` (declared in `module.json`). Also uses `redis` (caching + token store), `setting` (per-tenant caps), `audit_log` (DNS-failure logging), and `logger`.
