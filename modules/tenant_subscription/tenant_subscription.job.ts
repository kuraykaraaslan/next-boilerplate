import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/libs/redis/bullmq';
import TenantSubscriptionService from './tenant_subscription.service';
import Logger from '@/libs/logger';

const QUEUE_NAME = 'subscription-expire';

// ── Queue ──────────────────────────────────────────────────────────────────────
export const subscriptionExpireQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

// ── Worker ─────────────────────────────────────────────────────────────────────
export const subscriptionExpireWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const expired = await TenantSubscriptionService.expireOverdueSubscriptions();
    Logger.info(`[CronJob:subscription-expire] Expired ${expired} subscription(s)`);
    return { expired };
  },
  {
    connection: getBullMQConnection(),
    concurrency: 1,
  },
);

subscriptionExpireWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:subscription-expire] Job ${job?.id} failed: ${err.message}`);
});

// ── Schedule ───────────────────────────────────────────────────────────────────
// Called once at app startup to register the repeatable job.
// Safe to call multiple times — BullMQ deduplicates by pattern.
let _scheduled = false;

export async function scheduleSubscriptionExpireJob(
  cronPattern = '0 * * * *', // default: every hour
): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;

  await subscriptionExpireQueue.add(
    'expire-overdue',
    {},
    {
      repeat: { pattern: cronPattern },
      jobId: 'subscription-expire-recurring',
    },
  );

  Logger.info(`[CronJob:subscription-expire] Scheduled with pattern: ${cronPattern}`);
}
