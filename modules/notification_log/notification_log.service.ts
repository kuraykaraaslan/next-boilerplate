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
  error: z.string().nullable().optional(),
  attempts: z.number().optional(),
  eventType: z.string().nullable().optional(),
  recipientCountry: z.string().nullable().optional(),
  latencyMs: z.number().nullable().optional(),
  sentAt: z.date().or(z.string()),
});
export type SafeNotificationLog = z.infer<typeof SafeNotificationLogSchema>;

export interface NotificationLogOpts {
  subject?: string;
  provider?: string;
  providerMessageId?: string;
  error?: string;
  attempts?: number;
  eventType?: string;
  recipientCountry?: string;
  latencyMs?: number;
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

  /**
   * Cursor-based pagination (stable for large logs / infinite scroll). Returns
   * a page ordered by sentAt DESC plus the cursor to fetch the next page.
   */
  static async listCursor(
    tenantId: string,
    opts: { cursor?: string; limit?: number; channel?: NotificationChannel; status?: NotificationStatus } = {},
  ): Promise<{ logs: SafeNotificationLog[]; nextCursor: string | null }> {
    const ds = await tenantDataSourceFor(tenantId);
    const limit = Math.min(opts.limit ?? 50, 200);
    const qb = ds.getRepository(NotificationLog).createQueryBuilder('n')
      .where('n."tenantId" = :tenantId', { tenantId })
      .orderBy('n."sentAt"', 'DESC').addOrderBy('n."notificationLogId"', 'DESC')
      .take(limit + 1);
    if (opts.channel) qb.andWhere('n."channel" = :channel', { channel: opts.channel });
    if (opts.status) qb.andWhere('n."status" = :status', { status: opts.status });
    if (opts.cursor) {
      // Cursor encodes the last row's sentAt ISO timestamp.
      qb.andWhere('n."sentAt" < :cursor', { cursor: new Date(opts.cursor) });
    }
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].sentAt.toISOString() : null;
    return { logs: page.map((r) => SafeNotificationLogSchema.parse(r)), nextCursor };
  }

  /**
   * Aggregated delivery statistics for a tenant, grouped by channel + status,
   * with overall and per-channel success rates (operator/admin dashboard).
   */
  static async getStats(
    tenantId: string,
    opts: { from?: Date; to?: Date } = {},
  ): Promise<{
    overall: { sent: number; failed: number; pending: number; total: number; successRate: number };
    byChannel: Array<{ channel: string; sent: number; failed: number; pending: number; successRate: number }>;
  }> {
    const ds = await tenantDataSourceFor(tenantId);
    const qb = ds.getRepository(NotificationLog).createQueryBuilder('n')
      .select('n.channel', 'channel').addSelect('n.status', 'status').addSelect('COUNT(*)', 'count')
      .where('n."tenantId" = :tenantId', { tenantId });
    if (opts.from) qb.andWhere('n."sentAt" >= :from', { from: opts.from });
    if (opts.to) qb.andWhere('n."sentAt" <= :to', { to: opts.to });
    const rows = await qb.groupBy('n.channel').addGroupBy('n.status').getRawMany<{ channel: string; status: string; count: string }>();

    const channels = new Map<string, { sent: number; failed: number; pending: number }>();
    const overall = { sent: 0, failed: 0, pending: 0 };
    for (const r of rows) {
      const c = channels.get(r.channel) ?? { sent: 0, failed: 0, pending: 0 };
      const n = Number(r.count);
      if (r.status === 'sent') { c.sent += n; overall.sent += n; }
      else if (r.status === 'failed') { c.failed += n; overall.failed += n; }
      else { c.pending += n; overall.pending += n; }
      channels.set(r.channel, c);
    }
    const rate = (s: number, f: number) => (s + f) ? Math.round((s / (s + f)) * 1000) / 10 : 0;
    const total = overall.sent + overall.failed + overall.pending;
    return {
      overall: { ...overall, total, successRate: rate(overall.sent, overall.failed) },
      byChannel: [...channels.entries()].map(([channel, c]) => ({ channel, ...c, successRate: rate(c.sent, c.failed) })),
    };
  }

  /**
   * Right-to-erasure for a recipient (email / phone / userId): scrubs PII from
   * matching rows while keeping delivery stats, or hard-deletes when mode=DELETE.
   */
  static async eraseForRecipient(
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

  /**
   * Sustained-failure alert: if the failure rate over the recent window exceeds
   * `threshold` (default 50%) with at least `minVolume` attempts, dispatch a
   * `notification.failure_rate_high` webhook. Deduped per hour. Returns whether
   * an alert fired.
   */
  static async checkFailureRate(
    tenantId: string, opts: { windowMinutes?: number; threshold?: number; minVolume?: number } = {},
  ): Promise<boolean> {
    const windowMinutes = opts.windowMinutes ?? 30;
    const threshold = opts.threshold ?? 50;
    const minVolume = opts.minVolume ?? 20;
    const from = new Date(Date.now() - windowMinutes * 60 * 1000);
    const stats = await this.getStats(tenantId, { from });
    const { sent, failed } = stats.overall;
    const volume = sent + failed;
    if (volume < minVolume) return false;
    const failureRate = Math.round((failed / volume) * 1000) / 10;
    if (failureRate < threshold) return false;

    try {
      const { default: redis } = await import('@/modules/redis');
      const dedupKey = `notiflog:failalert:${tenantId}:${new Date().toISOString().slice(0, 13)}`; // per hour
      const set = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');
      if (set === null) return false;
    } catch { /* fail-open on dedup */ }

    try {
      const { default: WebhookService } = await import('@/modules/webhook/webhook.service');
      await WebhookService.dispatchEvent(tenantId, 'notification.failure_rate_high', {
        windowMinutes, failureRate, volume, failed, sent, byChannel: stats.byChannel,
      });
    } catch (e) {
      Logger.warn(`[notification_log] failure-rate webhook failed: ${e instanceof Error ? e.message : e}`);
    }
    return true;
  }
}
