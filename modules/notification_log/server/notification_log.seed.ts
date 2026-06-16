import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID } from '@nb/seed/server/seed.context';
import {
  NotificationLog,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification_log.entity';

/**
 * Demo seed for the notification_log module.
 *
 * NotificationLog is the unified outbound delivery audit row (one per attempt
 * across mail / sms / push / inapp). It carries a `tenantId` column, so it is
 * tenant-scoped — we use `ctx.repo(...)` and stamp `ctx.tenantId`.
 *
 * The entity has no DB `@Unique` constraint, so for idempotent re-runs we use
 * the natural per-delivery identifier `providerMessageId` (every provider hands
 * back a unique message id) as the `where` key in `foc`.
 *
 * We exercise every channel and every status, with realistic providers,
 * subjects, recipients and a populated `error` on the failed row, and back-date
 * `sentAt` so the rows read like a recent history.
 */
export async function seedNotificationLog(ctx: SeedContext): Promise<void> {
  const { tenantId, foc } = ctx;
  const repo = ctx.repo<NotificationLog>(NotificationLog);

  // Recipient ids: prefer published refs, fall back to seed constants/literals.
  const userId = (ctx.refs.userId as string) ?? SEED_USER_ID;

  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000);

  type LogDef = {
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    provider: string;
    status: NotificationStatus;
    providerMessageId: string;
    error?: string;
    sentAt: Date;
  };

  const defs: LogDef[] = [
    // mail — delivered via SES
    {
      channel: 'mail',
      recipient: 'demo.user@example.com',
      subject: 'Welcome to the platform 🎉',
      provider: 'ses',
      status: 'sent',
      providerMessageId: 'seed-mail-0100000000000000@email.amazonses.com',
      sentAt: minutesAgo(120),
    },
    // mail — bounced / failed via SMTP, with a captured error
    {
      channel: 'mail',
      recipient: 'bounce@invalid.example',
      subject: 'Your monthly invoice is ready',
      provider: 'smtp',
      status: 'failed',
      providerMessageId: 'seed-mail-0200000000000000@smtp.local',
      error: 'SMTP 550 5.1.1 Recipient address rejected: user unknown',
      sentAt: minutesAgo(90),
    },
    // sms — delivered via Twilio
    {
      channel: 'sms',
      recipient: '+15551234567',
      subject: 'Your verification code is 482913',
      provider: 'twilio',
      status: 'sent',
      providerMessageId: 'SMseed0000000000000000000000000003',
      sentAt: minutesAgo(45),
    },
    // sms — still in flight / pending via Vonage
    {
      channel: 'sms',
      recipient: '+447700900123',
      subject: 'Order shipped: tracking 1Z999',
      provider: 'vonage',
      status: 'pending',
      providerMessageId: 'seed-sms-vonage-0000000000000004',
      sentAt: minutesAgo(8),
    },
    // push — delivered via Firebase Cloud Messaging (recipient is a userId)
    {
      channel: 'push',
      recipient: userId,
      subject: 'You have 3 new notifications',
      provider: 'fcm',
      status: 'sent',
      providerMessageId: 'projects/seed/messages/0000000000000005',
      sentAt: minutesAgo(20),
    },
    // push — token expired / failed via FCM
    {
      channel: 'push',
      recipient: userId,
      subject: 'Flash sale ends tonight',
      provider: 'fcm',
      status: 'failed',
      providerMessageId: 'seed-push-fcm-0000000000000006',
      error: 'messaging/registration-token-not-registered: token is no longer valid',
      sentAt: minutesAgo(15),
    },
    // inapp — delivered to the in-app inbox (recipient is a userId)
    {
      channel: 'inapp',
      recipient: userId,
      subject: 'Your password was changed',
      provider: 'inapp',
      status: 'sent',
      providerMessageId: 'seed-inapp-0000000000000007',
      sentAt: minutesAgo(5),
    },
  ];

  for (const def of defs) {
    await foc(
      repo,
      { tenantId, providerMessageId: def.providerMessageId } as FindOptionsWhere<NotificationLog>,
      { tenantId, ...def },
    );
  }

  ctx.log(
    `notification_log: ${defs.length} delivery rows (mail/sms/push/inapp; sent/failed/pending) for ${tenantId}`,
  );
}
