import type { NotificationChannel, NotificationStatus, NotificationLog } from './entities/notification_log.entity';
import {
  SafeNotificationLogSchema, type SafeNotificationLog,
  type NotificationLogOpts, type NotificationLogQuery,
} from './notification_log.types';
import { log, pruneAndAnonymize, eraseForRecipient } from './notification_log.write.service';
import { list, getById, listCursor, getStats } from './notification_log.read.service';
import { checkFailureRate } from './notification_log.alerts.service';

// Re-exported so existing `notification_log.service` imports keep working.
export { SafeNotificationLogSchema };
export type { SafeNotificationLog, NotificationLogOpts, NotificationLogQuery };

/**
 * Tenant-scoped service for recording outbound notification deliveries
 * (mail, sms, push, inapp). Called by the channel-specific services from
 * their BullMQ worker completion / failure handlers.
 *
 * Best-effort: logging failures are swallowed so we never break the
 * outbound notification flow because the audit table is unavailable.
 *
 * The implementation is split across focused modules (`notification_log.write.service`
 * log/prune/erase, `notification_log.read.service` list/getById/listCursor/getStats,
 * `notification_log.alerts.service` failure-rate alerting, `notification_log.types`
 * schema/types); this class preserves the single `NotificationLogService.*` entry point.
 */
export default class NotificationLogService {
  static log(
    tenantId: string,
    channel: NotificationChannel,
    recipient: string,
    status: NotificationStatus,
    opts: NotificationLogOpts = {},
  ): Promise<NotificationLog | null> {
    return log(tenantId, channel, recipient, status, opts);
  }

  static list(
    tenantId: string,
    query: NotificationLogQuery = {},
  ): Promise<{ logs: SafeNotificationLog[]; total: number }> {
    return list(tenantId, query);
  }

  static pruneAndAnonymize(
    tenantId: string,
    opts: { anonymizeAfterDays?: number; deleteAfterDays?: number } = {},
  ): Promise<{ anonymized: number; deleted: number }> {
    return pruneAndAnonymize(tenantId, opts);
  }

  static getById(tenantId: string, id: string): Promise<SafeNotificationLog | null> {
    return getById(tenantId, id);
  }

  static listCursor(
    tenantId: string,
    opts: { cursor?: string; limit?: number; channel?: NotificationChannel; status?: NotificationStatus } = {},
  ): Promise<{ logs: SafeNotificationLog[]; nextCursor: string | null }> {
    return listCursor(tenantId, opts);
  }

  static getStats(
    tenantId: string,
    opts: { from?: Date; to?: Date } = {},
  ): Promise<{
    overall: { sent: number; failed: number; pending: number; total: number; successRate: number };
    byChannel: Array<{ channel: string; sent: number; failed: number; pending: number; successRate: number }>;
  }> {
    return getStats(tenantId, opts);
  }

  static eraseForRecipient(
    tenantId: string, recipient: string, mode: 'ANONYMIZE' | 'DELETE' = 'ANONYMIZE',
  ): Promise<number> {
    return eraseForRecipient(tenantId, recipient, mode);
  }

  static checkFailureRate(
    tenantId: string, opts: { windowMinutes?: number; threshold?: number; minVolume?: number } = {},
  ): Promise<boolean> {
    return checkFailureRate(tenantId, opts);
  }
}
