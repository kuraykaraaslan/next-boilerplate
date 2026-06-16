import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@nb/redis/server/redis.bullmq';
import TenantDeletionService from './tenant.deletion.service';
import Logger from '@nb/logger';

/**
 * Scheduled hard-purge of tenants whose `deleteAfter` timestamp has elapsed.
 * Soft-deletion is requested via `TenantService.requestDeletion()` which
 * schedules `deleteAfter` 30 days in the future; this job sweeps anything
 * past that horizon and physically removes the row + cascades data cleanup.
 *
 * Two trigger paths, pick one per deployment:
 *  - Self-hosted: call `scheduleTenantPurgeJob()` once at app startup
 *  - Serverless: hit POST /api/cron/purge-expired-tenants on the root tenant
 *    with the `CRON_SECRET` bearer token
 */
const QUEUE_NAME = 'tenant-purge';

export const tenantPurgeQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export const tenantPurgeWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const purged = await TenantDeletionService.purgeExpiredTenants();
    Logger.info(`[CronJob:tenant-purge] purged=${purged}`);
    return { purged };
  },
  {
    connection: getBullMQConnection(),
    concurrency: 1,
  },
);

tenantPurgeWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:tenant-purge] Job ${job?.id} failed: ${err.message}`);
});

let _scheduled = false;

export async function scheduleTenantPurgeJob(
  cronPattern = '0 4 * * *', // default: daily 04:00
): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;

  await tenantPurgeQueue.add(
    'purge-expired-tenants',
    {},
    {
      repeat: { pattern: cronPattern },
      jobId: 'tenant-purge-recurring',
    },
  );

  Logger.info(`[CronJob:tenant-purge] Scheduled with pattern: ${cronPattern}`);
}
