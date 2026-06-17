import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@kuraykaraaslan/redis/server/redis.bullmq';
import { TenantUsageService } from '@kuraykaraaslan/tenant_usage/server/tenant_usage.service';
import NotificationLogService from '@kuraykaraaslan/notification_log/server/notification_log.service';
import TenantFeatureGateService from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature-keys';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import type { MailOptions, MailResult } from './providers/base.provider';
import NotificationMailProviderService, { type MailProviderType } from './notification_mail.provider.service';
import { RedisIdempotencyService } from '@kuraykaraaslan/redis_idempotency';

interface MailJobData {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  provider?: MailProviderType;
  idempotencyKey?: string;
}

export default class NotificationMailQueueService {

  private static _initialized = false;

  static readonly QUEUE_NAME = 'mailQueue';

  static readonly APPLICATION_NAME = env.APPLICATION_NAME || 'Next Boilerplate';
  static readonly APPLICATION_HOST = env.APPLICATION_HOST || 'http://localhost:3000';
  static readonly MAIL_FROM = env.MAIL_FROM || `${NotificationMailQueueService.APPLICATION_NAME} <noreply@example.com>`;

  static readonly FRONTEND_URL                 = NotificationMailQueueService.APPLICATION_HOST;
  static readonly FRONTEND_LOGIN_PATH          = env.FRONTEND_LOGIN_PATH || '/auth/login';
  static readonly FRONTEND_REGISTER_PATH       = env.FRONTEND_REGISTER_PATH || '/auth/register';
  static readonly FRONTEND_PRIVACY_PATH        = env.FRONTEND_PRIVACY_PATH || '/privacy';
  static readonly FRONTEND_TERMS_PATH          = env.FRONTEND_TERMS_PATH || '/terms-of-use';
  static readonly FRONTEND_RESET_PASSWORD_PATH = env.FRONTEND_RESET_PASSWORD_PATH || '/auth/reset-password';
  static readonly FRONTEND_FORGOT_PASSWORD_PATH = env.FRONTEND_FORGOT_PASSWORD_PATH || '/auth/forgot-password';
  static readonly FRONTEND_SUPPORT_EMAIL       = env.FRONTEND_SUPPORT_EMAIL || 'support@example.com';
  static readonly INFORM_MAIL = env.INFORM_MAIL;
  static readonly INFORM_NAME = env.INFORM_NAME;

  static readonly QUEUE = new Queue<MailJobData>(NotificationMailQueueService.QUEUE_NAME, {
    connection: getBullMQConnection(),
  });

  static readonly WORKER = new Worker<MailJobData>(
    NotificationMailQueueService.QUEUE_NAME,
    async (job: Job<MailJobData>) => {
      const { tenantId, to, subject, html, provider, idempotencyKey } = job.data;
      Logger.info(`MAIL Worker processing job ${job.id}...`);
      // Worker retries (attempts: 4) must not re-send a mail the provider already
      // accepted: guard the actual send on the idempotency key when supplied.
      await RedisIdempotencyService.run(tenantId, idempotencyKey, () =>
        NotificationMailQueueService._sendMail({ tenantId, to, subject, html, provider }),
      );
    },
    { connection: getBullMQConnection(), concurrency: 5 },
  );

  static {
    if (!NotificationMailQueueService._initialized) {
      NotificationMailQueueService.WORKER.on('completed', (job: Job<MailJobData>) => {
        Logger.info(`MAIL Worker completed job ${job.id}`);
      });
      NotificationMailQueueService.WORKER.on('failed', (job: Job<MailJobData> | undefined, err: Error) => {
        Logger.error(`MAIL Worker failed job ${job?.id ?? 'unknown'}: ${err.message}`);
      });
      NotificationMailQueueService._initialized = true;
    }
  }

  static async assertMailFeatureAccess(tenantId: string): Promise<void> {
    if (isRootTenant(tenantId)) return;
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_EMAIL_SEND);
    const usage = await TenantUsageService.getUsage(tenantId);
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_EMAIL_MONTHLY_QUOTA, usage.emailSends);
  }

  static async sendMail(
    tenantId: string, to: string, subject: string, html: string, provider?: MailProviderType,
    idempotencyKey?: string,
  ): Promise<void> {
    try {
      await NotificationMailQueueService.assertMailFeatureAccess(tenantId);
      await NotificationMailQueueService.QUEUE.add('sendMail', { tenantId, to, subject, html, provider, idempotencyKey }, {
        attempts: 4,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
        // Same key → BullMQ refuses the duplicate enqueue (first-line dedupe).
        ...(idempotencyKey ? { jobId: `mail:${tenantId}:${idempotencyKey}` } : {}),
      });
    } catch (error: unknown) {
      Logger.error(`MAIL sendMail ERROR: ${to} ${subject} ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendMailDirect(
    tenantId: string, to: string, subject: string, html: string, provider?: MailProviderType,
    idempotencyKey?: string,
  ): Promise<MailResult> {
    await NotificationMailQueueService.assertMailFeatureAccess(tenantId);
    return RedisIdempotencyService.run(tenantId, idempotencyKey, () =>
      NotificationMailQueueService._sendMail({ tenantId, to, subject, html, provider }),
    );
  }

  private static async _sendMail({ tenantId, to, subject, html, provider: providerName }: MailJobData): Promise<MailResult> {
    await NotificationMailQueueService.assertMailFeatureAccess(tenantId);
    const provider = await NotificationMailProviderService.getProvider(tenantId, providerName);
    const from = await NotificationMailProviderService.resolveFrom(tenantId);
    const options: MailOptions = { to, subject, html, from };
    let result: MailResult;
    try {
      result = await provider.sendMail(tenantId, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await NotificationLogService.log(tenantId, 'mail', to, 'failed', { subject, provider: provider.name, error: message });
      throw err;
    }
    if (result.success) {
      await TenantUsageService.incrementEmailSends(tenantId, 1).catch((err) => {
        Logger.warn(`_sendMail usage increment failed: ${err instanceof Error ? err.message : String(err)}`);
      });
      await NotificationLogService.log(tenantId, 'mail', to, 'sent', {
        subject, provider: provider.name, providerMessageId: result.messageId,
      }).catch((err) => {
        Logger.warn(`_sendMail notification log failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    } else {
      await NotificationLogService.log(tenantId, 'mail', to, 'failed', {
        subject, provider: provider.name, error: result.error,
      }).catch((err) => {
        Logger.warn(`_sendMail notification log failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
    return result;
  }
}
