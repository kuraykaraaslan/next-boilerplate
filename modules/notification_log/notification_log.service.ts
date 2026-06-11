import { z } from 'zod';
import { type FindOptionsWhere } from 'typeorm';
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

    const [rows, total] = await repo.findAndCount({
      where,
      order: { sentAt: 'DESC' },
      skip: query.offset ?? 0,
      take: Math.min(query.limit ?? 50, 200),
    });

    return { logs: rows.map((r) => SafeNotificationLogSchema.parse(r)), total };
  }

  static async getById(tenantId: string, id: string): Promise<SafeNotificationLog | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(NotificationLog);
    const row = await repo.findOne({ where: { tenantId, notificationLogId: id } });
    return row ? SafeNotificationLogSchema.parse(row) : null;
  }
}
