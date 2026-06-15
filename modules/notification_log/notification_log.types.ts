import { z } from 'zod';
import type { NotificationChannel, NotificationStatus } from './entities/notification_log.entity';

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
