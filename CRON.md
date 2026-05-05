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
| HTTP endpoint | `POST /system/api/cron/expire-subscriptions` |

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
POST /system/api/cron/expire-subscriptions
Authorization: Bearer <CRON_SECRET>
```

### Vercel Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/system/api/cron/expire-subscriptions",
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
          curl -X POST ${{ vars.APP_URL }}/system/api/cron/expire-subscriptions \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### curl (manual / testing)

```bash
curl -X POST http://localhost:3000/system/api/cron/expire-subscriptions \
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
3. **HTTP path**: create `app/system/api/cron/<job-name>/route.ts` with Bearer auth guard.
4. Document it in this file under **Registered Jobs**.
