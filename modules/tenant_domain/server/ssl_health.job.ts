import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@kuraykaraaslan/redis/server/redis.bullmq';
import SSLProvisioningService from './ssl_provisioning.service';
import Logger from '@kuraykaraaslan/logger';

/**
 * Daily TLS handshake probe across every tenant custom domain — keeps the
 * `sslStatus / sslIssuedAt / sslExpiresAt / sslIssuer / sslLastCheckedAt`
 * fields on `TenantDomain` in sync with reality. Without this the admin
 * sees stale "ACTIVE" labels even after a Let's Encrypt renewal fails.
 *
 * Two trigger paths:
 *  - Self-hosted: call `scheduleSslHealthJob()` at boot
 *  - Serverless: hit POST /api/cron/ssl-health on the root tenant with the
 *    `CRON_SECRET` bearer token
 */
const QUEUE_NAME = 'tenant-domain-ssl-health';

export const sslHealthQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export const sslHealthWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const { checked, activated, expiring, failed } = await SSLProvisioningService.recheckCertificates();
    Logger.info(
      `[CronJob:ssl-health] checked=${checked} active=${activated} expiring=${expiring} failed=${failed}`,
    );
    return { checked, activated, expiring, failed };
  },
  { connection: getBullMQConnection(), concurrency: 1 },
);

sslHealthWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:ssl-health] Job ${job?.id} failed: ${err.message}`);
});

let _scheduled = false;

export async function scheduleSslHealthJob(
  cronPattern = '15 5 * * *', // default: daily 05:15 — staggered from other 03:00 / 04:00 jobs
): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;

  await sslHealthQueue.add(
    'ssl-health',
    {},
    {
      repeat: { pattern: cronPattern },
      jobId: 'tenant-domain-ssl-health-recurring',
    },
  );

  Logger.info(`[CronJob:ssl-health] Scheduled with pattern: ${cronPattern}`);
}
