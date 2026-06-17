import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@kuraykaraaslan/redis/server/redis.bullmq';
import DNSVerificationService from './dns_verification.service';
import Logger from '@kuraykaraaslan/logger';

/**
 * Periodic DNS health-check for ACTIVE tenant domains. The original one-shot
 * verification token lives in Redis for 24h — once it expires there is no
 * guarantee the customer's DNS still points at us. This job re-resolves every
 * ACTIVE domain on a cadence and downgrades broken ones to `DNS_FAILED`.
 *
 * Two trigger paths, pick one per deployment:
 *  - Self-hosted: call `scheduleDnsRecheckJob()` once at app startup
 *  - Serverless: hit POST /tenant/<root>/api/cron/dns-recheck with the
 *    `CRON_SECRET` bearer token
 */
const QUEUE_NAME = 'tenant-domain-dns-recheck';

export const dnsRecheckQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export const dnsRecheckWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const { checked, downgraded } = await DNSVerificationService.recheckActiveDomains();
    Logger.info(`[CronJob:tenant-domain-dns-recheck] checked=${checked} downgraded=${downgraded}`);
    return { checked, downgraded };
  },
  {
    connection: getBullMQConnection(),
    concurrency: 1,
  },
);

dnsRecheckWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:tenant-domain-dns-recheck] Job ${job?.id} failed: ${err.message}`);
});

let _scheduled = false;

export async function scheduleDnsRecheckJob(
  cronPattern = '0 */6 * * *', // default: every 6 hours
): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;

  await dnsRecheckQueue.add(
    'dns-recheck',
    {},
    {
      repeat: { pattern: cronPattern },
      jobId: 'tenant-domain-dns-recheck-recurring',
    },
  );

  Logger.info(`[CronJob:tenant-domain-dns-recheck] Scheduled with pattern: ${cronPattern}`);
}
