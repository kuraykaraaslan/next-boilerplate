import { Queue, Worker, Job } from 'bullmq';
import { LessThan, In } from 'typeorm';
import { getBullMQConnection } from '@kuraykaraaslan/redis/server/redis.bullmq';
import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';
import { Tenant } from '@kuraykaraaslan/tenant/server/entities/tenant.entity';
import { GiftCard } from './entities/gift_card.entity';
import { GiftCardTransaction } from './entities/gift_card_transaction.entity';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import Logger from '@kuraykaraaslan/logger';

/**
 * Daily sweep that flips gift cards past their `expiresAt` (and still holding a
 * balance) to `EXPIRED`, writes a ledger row, and dispatches `gift_card.expired`.
 *
 *  - Self-hosted: call `scheduleGiftCardExpiryJob()` at boot.
 *  - Serverless: hit the cron endpoint with the `CRON_SECRET` bearer token.
 */
const QUEUE_NAME = 'gift-card-expiry';

export const giftCardExpiryQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: { removeOnComplete: 10, removeOnFail: 50 },
});

/** Expire overdue cards for a single tenant. Returns the count expired. */
export async function expireGiftCardsForTenant(tenantId: string): Promise<number> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(GiftCard);
  const txRepo = ds.getRepository(GiftCardTransaction);

  const due = await repo.find({
    where: {
      tenantId,
      status: In(['ACTIVE', 'PARTIALLY_REDEEMED']),
      expiresAt: LessThan(new Date()),
    },
  });

  let expired = 0;
  for (const card of due) {
    const forfeited = card.remainingAmount;
    card.status = 'EXPIRED';
    card.remainingAmount = 0;
    await repo.save(card);
    await txRepo.save(txRepo.create({
      tenantId,
      giftCardId: card.giftCardId,
      type: 'VOID',
      amount: -forfeited,
      balanceAfter: 0,
      note: 'Expired',
    }));
    await WebhookService.dispatchEvent(tenantId, 'gift_card.expired', {
      giftCardId: card.giftCardId,
      forfeitedAmount: forfeited,
      currency: card.currency,
    }).catch(() => {});
    expired += 1;
  }
  return expired;
}

export const giftCardExpiryWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const ds = await getDataSource();
    const tenants = await ds.getRepository(Tenant).find({ where: { tenantStatus: 'ACTIVE' } });
    let expired = 0;
    for (const t of tenants) {
      try {
        expired += await expireGiftCardsForTenant(t.tenantId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.warn(`[CronJob:gift-card-expiry] failed for ${t.tenantId}: ${message}`);
      }
    }
    Logger.info(`[CronJob:gift-card-expiry] expired=${expired} tenants=${tenants.length}`);
    return { expired, tenants: tenants.length };
  },
  { connection: getBullMQConnection(), concurrency: 1 },
);

giftCardExpiryWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:gift-card-expiry] Job ${job?.id} failed: ${err.message}`);
});

export async function scheduleGiftCardExpiryJob(
  cronPattern = '30 2 * * *', // default: daily at 02:30
): Promise<void> {
  await giftCardExpiryQueue.add(
    'sweep',
    {},
    { repeat: { pattern: cronPattern }, jobId: 'gift-card-expiry-recurring' },
  );
  Logger.info(`[CronJob:gift-card-expiry] Scheduled with pattern: ${cronPattern}`);
}
