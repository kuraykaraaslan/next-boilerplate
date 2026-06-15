import { LessThan } from 'typeorm';
import Logger from '@/modules/logger';
import { tenantDataSourceFor } from '@/modules/db';
import {
  NotificationLog,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification_log.entity';
import type { NotificationLogOpts } from './notification_log.types';

export async function log(
  tenantId: string,
  channel: NotificationChannel,
  recipient: string,
  status: NotificationStatus,
  opts: NotificationLogOpts = {},
): Promise<NotificationLog | null> {
  if (!tenantId || !recipient) return null;

  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(NotificationLog);
    const row = repo.create({
      tenantId,
      channel,
      recipient,
      status,
      subject: opts.subject,
      provider: opts.provider || 'unknown',
      providerMessageId: opts.providerMessageId,
      error: opts.error,
      attempts: opts.attempts ?? 1,
      eventType: opts.eventType,
      recipientCountry: opts.recipientCountry,
      latencyMs: opts.latencyMs,
    });
    return await repo.save(row);
  } catch (error) {
    Logger.warn(
      `NotificationLogService.log failed (${channel}/${status}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/**
 * Retention pruning with PII protection: rows older than `anonymizeAfterDays`
 * have their recipient/subject/error scrubbed (delivery stats kept for
 * analytics); rows older than `deleteAfterDays` are removed entirely. Meant to
 * run from a scheduled job. Returns counts. `deleteAfterDays = 0` disables
 * hard deletion.
 */
export async function pruneAndAnonymize(
  tenantId: string,
  opts: { anonymizeAfterDays?: number; deleteAfterDays?: number } = {},
): Promise<{ anonymized: number; deleted: number }> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(NotificationLog);
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let anonymized = 0;
  let deleted = 0;

  const anonDays = opts.anonymizeAfterDays ?? 90;
  if (anonDays > 0) {
    const cutoff = new Date(now - anonDays * DAY);
    const res = await repo
      .createQueryBuilder()
      .update(NotificationLog)
      .set({ recipient: '[redacted]', subject: undefined, error: undefined })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('sentAt < :cutoff', { cutoff })
      .andWhere('recipient != :red', { red: '[redacted]' })
      .execute();
    anonymized = res.affected ?? 0;
  }

  if (opts.deleteAfterDays && opts.deleteAfterDays > 0) {
    const cutoff = new Date(now - opts.deleteAfterDays * DAY);
    const res = await repo.delete({ tenantId, sentAt: LessThan(cutoff) });
    deleted = res.affected ?? 0;
  }

  return { anonymized, deleted };
}

/**
 * Right-to-erasure for a recipient (email / phone / userId): scrubs PII from
 * matching rows while keeping delivery stats, or hard-deletes when mode=DELETE.
 */
export async function eraseForRecipient(
  tenantId: string, recipient: string, mode: 'ANONYMIZE' | 'DELETE' = 'ANONYMIZE',
): Promise<number> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(NotificationLog);
  if (mode === 'DELETE') {
    const res = await repo.delete({ tenantId, recipient });
    return res.affected ?? 0;
  }
  const res = await repo.createQueryBuilder()
    .update(NotificationLog)
    .set({ recipient: '[redacted]', subject: undefined, error: undefined })
    .where('tenantId = :tenantId', { tenantId })
    .andWhere('recipient = :recipient', { recipient })
    .execute();
  return res.affected ?? 0;
}
