import { z } from 'zod';
import { type FindOptionsWhere, Between, LessThanOrEqual, MoreThanOrEqual, ILike, LessThan } from 'typeorm';
import Logger from '@/modules/logger';
import { tenantDataSourceFor } from '@/modules/db';
import {
  NotificationLog,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification_log.entity';

export const SafeNotificationLogSchema = z.object({
  notificationLogId: z.string(),
  tenantId: z.string(),
  channel: z.string(),
  recipient: z.string(),
  subject: z.string().optional(),
  provider: z.string(),
  status: z.string(),
  providerMessageId: z.string().optional(),
  sentAt: z.date().or(z.string()),
});
export type SafeNotificationLog = z.infer<typeof SafeNotificationLogSchema>;

export interface NotificationLogOpts {
  subject?: string;
  provider?: string;
  providerMessageId?: string;
  error?: string;
}

export interface NotificationLogQuery {
  channel?: NotificationChannel;
  status?: NotificationStatus;
  recipient?: string;
  /** Substring match on recipient (ILike) — distinct from the exact `recipient`. */
  recipientSearch?: string;
  /** Inclusive lower bound on sentAt. */
  from?: Date;
  /** Inclusive upper bound on sentAt. */
  to?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Tenant-scoped service for recording outbound notification deliveries
 * (mail, sms, push, inapp). Called by the channel-specific services from
 * their BullMQ worker completion / failure handlers.
 *
 * Best-effort: logging failures are swallowed so we never break the
 * outbound notification flow because the audit table is unavailable.
 */
export default class NotificationLogService {
  static async log(
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

  static async list(
    tenantId: string,
    query: NotificationLogQuery = {},
  ): Promise<{ logs: SafeNotificationLog[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(NotificationLog);

    const where: FindOptionsWhere<NotificationLog> = { tenantId };
    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;
    if (query.recipient) where.recipient = query.recipient;
    else if (query.recipientSearch) where.recipient = ILike(`%${query.recipientSearch}%`);
    if (query.from && query.to) where.sentAt = Between(query.from, query.to);
    else if (query.from) where.sentAt = MoreThanOrEqual(query.from);
    else if (query.to) where.sentAt = LessThanOrEqual(query.to);

    const [rows, total] = await repo.findAndCount({
      where,
      order: { sentAt: 'DESC' },
      skip: query.offset ?? 0,
      take: Math.min(query.limit ?? 50, 200),
    });

    return { logs: rows.map((r) => SafeNotificationLogSchema.parse(r)), total };
  }

  /**
   * Retention pruning with PII protection: rows older than `anonymizeAfterDays`
   * have their recipient/subject/error scrubbed (delivery stats kept for
   * analytics); rows older than `deleteAfterDays` are removed entirely. Meant to
   * run from a scheduled job. Returns counts. `deleteAfterDays = 0` disables
   * hard deletion.
   */
  static async pruneAndAnonymize(
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

  static async getById(tenantId: string, id: string): Promise<SafeNotificationLog | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(NotificationLog);
    const row = await repo.findOne({ where: { tenantId, notificationLogId: id } });
    return row ? SafeNotificationLogSchema.parse(row) : null;
  }
}
