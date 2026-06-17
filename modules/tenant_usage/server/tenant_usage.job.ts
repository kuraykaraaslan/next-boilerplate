import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@kuraykaraaslan/redis/server/redis.bullmq';
import { getDataSource } from '@kuraykaraaslan/db';
import { Tenant } from '@kuraykaraaslan/tenant/server/entities/tenant.entity';
import { TenantUsageService } from './tenant_usage.service';
import { TenantUsageAlertsService } from './tenant_usage.alerts.service';
import Logger from '@kuraykaraaslan/logger';

/**
 * Hourly flush of every active tenant's Redis usage counters into the
 * `TenantUsage` table. Critical for billing: Redis monthly counters have a
 * 32-day TTL, so without a periodic flush month-end data can be lost.
 *
 * Two trigger paths:
 *  - Self-hosted: call `scheduleUsageFlushJob()` at boot
 *  - Serverless: hit POST /api/cron/usage-flush on the root tenant with the
 *    `CRON_SECRET` bearer token
 */
const QUEUE_NAME = 'tenant-usage-flush';

export const usageFlushQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export const usageFlushWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const ds = await getDataSource();
    const tenants = await ds.getRepository(Tenant).find({ where: { tenantStatus: 'ACTIVE' } });
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    let flushed = 0;
    let alerts = 0;
    for (const t of tenants) {
      try {
        await TenantUsageService.flushToDb(t.tenantId, month);
        flushed += 1;
        // After flushing, evaluate quota alerts/overage (best-effort).
        const res = await TenantUsageAlertsService.evaluateAlerts(t.tenantId).catch(() => null);
        if (res) alerts += res.thresholds + res.overages;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.warn(`[CronJob:usage-flush] flush failed for ${t.tenantId}: ${message}`);
      }
    }
    Logger.info(`[CronJob:usage-flush] flushed=${flushed}/${tenants.length} alerts=${alerts} month=${month}`);
    return { flushed, total: tenants.length, alerts, month };
  },
  { connection: getBullMQConnection(), concurrency: 1 },
);

usageFlushWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:usage-flush] Job ${job?.id} failed: ${err.message}`);
});

let _scheduled = false;

export async function scheduleUsageFlushJob(
  cronPattern = '0 * * * *', // default: hourly
): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;

  await usageFlushQueue.add(
    'flush-usage',
    {},
    {
      repeat: { pattern: cronPattern },
      jobId: 'tenant-usage-flush-recurring',
    },
  );

  Logger.info(`[CronJob:usage-flush] Scheduled with pattern: ${cronPattern}`);
}
