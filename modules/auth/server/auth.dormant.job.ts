import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@nb/redis/server/redis.bullmq';
import AuthService from './auth.service';
import Logger from '@nb/logger';

/**
 * KD-15: scheduled sweep that marks accounts dormant (INACTIVE) when the
 * last successful login is older than `dormantAccountDays` (default 90).
 *
 * Two trigger paths, pick one per deployment:
 *  - Self-hosted: call `scheduleDormantSweepJob()` once at app startup
 *  - Serverless: hit POST /api/cron/dormant-sweep on the root tenant with the
 *    `CRON_SECRET` bearer token
 */
const QUEUE_NAME = 'auth-dormant-sweep';

export const dormantSweepQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export const dormantSweepWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const { scanned, disabled, erased } = await AuthService.disableDormantAccounts();
    Logger.info(`[CronJob:auth-dormant-sweep] scanned=${scanned} disabled=${disabled} erased=${erased}`);
    return { scanned, disabled, erased };
  },
  {
    connection: getBullMQConnection(),
    concurrency: 1,
  },
);

dormantSweepWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:auth-dormant-sweep] Job ${job?.id} failed: ${err.message}`);
});

let _scheduled = false;

export async function scheduleDormantSweepJob(
  cronPattern = '0 3 * * *', // default: daily 03:00
): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;

  await dormantSweepQueue.add(
    'sweep-dormant',
    {},
    {
      repeat: { pattern: cronPattern },
      jobId: 'auth-dormant-sweep-recurring',
    },
  );

  Logger.info(`[CronJob:auth-dormant-sweep] Scheduled with pattern: ${cronPattern}`);
}
