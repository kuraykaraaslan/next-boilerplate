# Cron Jobs

Scheduled tasks in this boilerplate run via **two interchangeable options**: an in-process BullMQ worker or an HTTP endpoint. Pick one per deployment — they are not meant to run simultaneously for the same job.

---

## Registered Jobs

### `expire-subscriptions`

Finds all `PAST_DUE` subscriptions whose grace period has ended and marks them `EXPIRED`. Runs every hour by default.

| Property | Value |
|---|---|
| Service method | `TenantSubscriptionService.expireOverdueSubscriptions()` |
| Default schedule | Every hour (`0 * * * *`) |
| BullMQ queue | `subscription-expire` |
| HTTP endpoint | `POST /api/tenant/00000000-0000-4000-8000-000000000000/admin/cron/expire-subscriptions` |

### `dormant-sweep` (KD-15)

Marks user accounts `INACTIVE` when their last successful login is older than the configured `dormantAccountDays` (default 90). Honours the `dormantAccountAutoDisable` flag — when `false` the job runs in dry-run mode and only reports.

| Property | Value |
|---|---|
| Service method | `AuthService.disableDormantAccounts()` |
| Default schedule | Daily at 03:00 (`0 3 * * *`) |
| BullMQ queue | `auth-dormant-sweep` |
| BullMQ scheduler | `scheduleDormantSweepJob()` from `modules/auth/auth.dormant.job.ts` |
| HTTP endpoint | `POST /api/tenant/00000000-0000-4000-8000-000000000000/api/cron/dormant-sweep` |

### `purge-expired-tenants`

Hard-deletes tenants whose 30-day soft-delete grace period has elapsed (`Tenant.deleteAfter <= now`).

| Property | Value |
|---|---|
| Service method | `TenantDeletionService.purgeExpiredTenants()` |
| Default schedule | Daily at 04:00 (`0 4 * * *`) |
| BullMQ queue | `tenant-purge` |
| BullMQ scheduler | `scheduleTenantPurgeJob()` from `modules/tenant/tenant.deletion.job.ts` |
| HTTP endpoint | `POST /api/tenant/00000000-0000-4000-8000-000000000000/api/cron/purge-expired-tenants` |

### `tenant-domain-dns-recheck`

Re-resolves the TXT/CNAME records of every `ACTIVE` `TenantDomain` and downgrades
broken ones to `DNS_FAILED` (admin must then manually re-verify). Closes the
gap where one-shot verification tokens expire after 24h and silent DNS
breakage goes undetected.

| Property | Value |
|---|---|
| Service method | `DNSVerificationService.recheckActiveDomains()` |
| Default schedule | Every 6 hours (`0 */6 * * *`) |
| BullMQ queue | `tenant-domain-dns-recheck` |
| BullMQ scheduler | `scheduleDnsRecheckJob()` from `modules/tenant_domain/tenant_domain.job.ts` |
| HTTP endpoint | `POST /api/tenant/00000000-0000-4000-8000-000000000000/api/cron/dns-recheck` |

### `tenant-usage-flush`

Flushes every active tenant's Redis usage counters (`apiCalls`, `aiTokens`, `storageBytes`, `emailSends`, `smsSends`) into the `TenantUsage` table for the current month. Without this job, Redis monthly counters (32-day TTL) lose month-end totals before they're persisted.

| Property | Value |
|---|---|
| Service method | `TenantUsageService.flushToDb(tenantId, month)` per active tenant |
| Default schedule | Hourly (`0 * * * *`) |
| BullMQ queue | `tenant-usage-flush` |
| BullMQ scheduler | `scheduleUsageFlushJob()` from `modules/tenant_usage/tenant_usage.job.ts` |
| HTTP endpoint | `POST /api/tenant/00000000-0000-4000-8000-000000000000/api/cron/usage-flush` |

### `tenant-domain-ssl-health`

Opens a TLS handshake against every active tenant custom domain, parses the leaf certificate, and writes `sslStatus / sslIssuedAt / sslExpiresAt / sslIssuer / sslLastCheckedAt` back to the `TenantDomain` row. Certs expiring within 30 days are flagged `EXPIRING`; handshakes that fail (untrusted cert, DNS broken, connection refused) downgrade to `FAILED`. Operator must inspect the reverse proxy when this happens. See [docs/caddy-on-demand-tls.md](docs/caddy-on-demand-tls.md) and [ADR 0005](docs/adr/0005-tenant-custom-domain-ssl.md).

| Property | Value |
|---|---|
| Service method | `SSLProvisioningService.recheckCertificates()` |
| Default schedule | Daily at 05:15 (`15 5 * * *`) |
| BullMQ queue | `tenant-domain-ssl-health` |
| BullMQ scheduler | `scheduleSslHealthJob()` from `modules/tenant_domain/ssl_health.job.ts` |
| HTTP endpoint | `POST /api/tenant/00000000-0000-4000-8000-000000000000/api/cron/ssl-health` |

### `gift-card-expiry`

Flips gift cards past their `expiresAt` (still holding a balance) to `EXPIRED` across every active tenant, writing a ledger row and dispatching `gift_card.expired`. Idempotent — already-expired cards are skipped.

| Property | Value |
|---|---|
| Service method | `expireGiftCardsForTenant(tenantId)` per active tenant |
| Default schedule | Daily at 02:30 (`30 2 * * *`) |
| BullMQ queue | `gift-card-expiry` |
| BullMQ scheduler | `scheduleGiftCardExpiryJob()` from `modules/gift_card/gift_card.expiry.job.ts` |
| HTTP endpoint | `POST /api/tenant/00000000-0000-4000-8000-000000000000/api/cron/gift-card-expiry` |

---

## Option A — BullMQ (Self-hosted / Always-on)

Best for: self-hosted deployments with a persistent Node.js process and Redis.

### Setup

Import and call `scheduleSubscriptionExpireJob()` once at app startup (e.g., in a custom server file or a top-level module that runs on boot):

```ts
import { scheduleSubscriptionExpireJob } from '@/modules/tenant_subscription/tenant_subscription.job';

// In your server startup / instrumentation file:
await scheduleSubscriptionExpireJob(); // default: '0 * * * *'

// Custom schedule:
await scheduleSubscriptionExpireJob('*/30 * * * *'); // every 30 min
```

The Worker (`subscriptionExpireWorker`) starts as soon as the module is imported. The repeatable job is registered once and survives process restarts — BullMQ re-picks it up from Redis on the next start.

### Next.js Instrumentation Hook (recommended)

```ts
// instrumentation.ts  (Next.js 14+ — enable in next.config.ts: experimental.instrumentationHook)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { scheduleSubscriptionExpireJob } = await import(
      '@/modules/tenant_subscription/tenant_subscription.job'
    );
    await scheduleSubscriptionExpireJob();
  }
}
```

Enable in [next.config.ts](next.config.ts):
```ts
experimental: {
  instrumentationHook: true,
}
```

### Notes
- The Worker runs in the same process as Next.js — fine for self-hosted, not for Vercel (serverless).
- BullMQ deduplicates the repeatable job by `jobId` — safe to call `scheduleSubscriptionExpireJob()` multiple times.
- To change the schedule at runtime, call `subscriptionExpireQueue.removeRepeatable(...)` first, then re-add.

---

## Option B — HTTP Endpoint (Vercel / External Schedulers)

Best for: Vercel deployments, GitHub Actions, Upstash QStash, cron-job.org, or any external HTTP scheduler.

### Setup

Set the `CRON_SECRET` environment variable:

```env
CRON_SECRET=your-long-random-secret-here
```

Then trigger the endpoint on your desired schedule:

```
POST /api/tenant/00000000-0000-4000-8000-000000000000/admin/cron/expire-subscriptions
Authorization: Bearer <CRON_SECRET>
```

### Vercel Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/tenant/00000000-0000-4000-8000-000000000000/admin/cron/expire-subscriptions",
      "schedule": "0 * * * *"
    }
  ]
}
```

> Vercel Cron does not send an `Authorization` header. Use the `CRON_SECRET` check only for external callers; for Vercel you can verify via `request.headers.get('x-vercel-signature')` instead. Or set `CRON_SECRET` to empty/undefined to skip auth when running on Vercel.

### GitHub Actions

```yaml
name: Expire Subscriptions
on:
  schedule:
    - cron: '0 * * * *'
jobs:
  expire:
    runs-on: ubuntu-latest
    steps:
      - name: Call expire endpoint
        run: |
          curl -X POST ${{ vars.APP_URL }}/api/tenant/00000000-0000-4000-8000-000000000000/admin/cron/expire-subscriptions \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### curl (manual / testing)

```bash
curl -X POST http://localhost:3000/api/tenant/00000000-0000-4000-8000-000000000000/admin/cron/expire-subscriptions \
  -H "Authorization: Bearer dev-cron-secret-change-in-production"
```

### Response

```json
{ "success": true, "expired": 3 }
```

---

## Adding a New Cron Job

1. Add the core logic as a `static` method on the relevant service.
2. **BullMQ path**: create `<module>.job.ts` following the pattern in [modules/tenant_subscription/tenant_subscription.job.ts](modules/tenant_subscription/tenant_subscription.job.ts).
3. **HTTP path**: create `app/tenant/[tenantId]/api/cron/<job-name>/route.ts` with a Bearer auth guard. Only reachable under the root tenant.
4. Document it in this file under **Registered Jobs**.
