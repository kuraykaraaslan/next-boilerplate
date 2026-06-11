import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/modules/redis/redis.bullmq';
import redis from '@/modules/redis';
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';
import NotificationLogService from '@/modules/notification_log/notification_log.service';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import type { SMSResult } from './providers/base.provider';
import NotificationSmsProviderService, { type SMSProviderType } from './notification_sms.provider.service';

interface SMSJobData {
  tenantId: string;
  to: string;
  body: string;
  provider?: SMSProviderType;
}

export default class NotificationSmsQueueService {

  private static _initialized = false;

  static readonly QUEUE_NAME = 'smsQueue';
  static readonly RATE_LIMIT_SECONDS = env.SMS_RATE_LIMIT_SECONDS ?? 60;
  static readonly RATE_LIMIT_PREFIX = 'sms:rate-limit:';

  static readonly QUEUE = new Queue<SMSJobData>(NotificationSmsQueueService.QUEUE_NAME, {
    connection: getBullMQConnection(),
  });

  static readonly WORKER = new Worker<SMSJobData>(
    NotificationSmsQueueService.QUEUE_NAME,
    async (job: Job<SMSJobData>) => {
      const { tenantId, to, body, provider } = job.data;
      Logger.info(`SMS Worker ${job.id} processing...`);
      await NotificationSmsQueueService._sendShortMessage({ tenantId, to, body, provider });
    },
    { connection: getBullMQConnection() },
  );

  static {
    if (!NotificationSmsQueueService._initialized) {
      NotificationSmsQueueService.WORKER.on('completed', (job: Job<SMSJobData>) => {
        Logger.info(`SMS Worker ${job.id} completed`);
      });
      NotificationSmsQueueService.WORKER.on('failed', (job: Job<SMSJobData> | undefined, err: Error) => {
        Logger.error(`SMS Worker ${job?.id ?? 'unknown'} failed: ${err.message}`);
      });
      NotificationSmsQueueService._initialized = true;
    }
  }

  static async assertSmsFeatureAccess(tenantId: string): Promise<void> {
    if (isRootTenant(tenantId)) return;
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_SMS_SEND);
    const usage = await TenantUsageService.getUsage(tenantId);
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_SMS_MONTHLY_QUOTA, usage.smsSends);
  }

  static async sendShortMessage(
    tenantId: string,
    { to, body, provider }: { to: string; body: string; provider?: SMSProviderType },
  ): Promise<void> {
    if (!to?.trim() || !body?.trim()) {
      Logger.warn('NotificationSmsQueueService: Missing phone number or message body.');
      return;
    }
    await NotificationSmsQueueService.assertSmsFeatureAccess(tenantId);
    try {
      const rateLimitKey = `${NotificationSmsQueueService.RATE_LIMIT_PREFIX}${tenantId}:${to}`;
      const existing = await redis.get(rateLimitKey);
      if (existing) {
        Logger.warn(`NotificationSmsQueueService: Rate limit hit for ${to}. Message not queued.`);
        return;
      }
      await redis.set(rateLimitKey, '1', 'EX', NotificationSmsQueueService.RATE_LIMIT_SECONDS);
      await NotificationSmsQueueService.QUEUE.add('sendShortMessage', { tenantId, to, body, provider });
      Logger.info(`NotificationSmsQueueService: Queued SMS to ${to}`);
    } catch (error: unknown) {
      Logger.error(`NotificationSmsQueueService.sendShortMessage error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendShortMessageDirect(
    tenantId: string,
    { to, body, provider }: { to: string; body: string; provider?: SMSProviderType },
  ): Promise<SMSResult | void> {
    await NotificationSmsQueueService.assertSmsFeatureAccess(tenantId);
    return NotificationSmsQueueService._sendShortMessage({ tenantId, to, body, provider });
  }

  private static async _sendShortMessage({
    tenantId, to, body, provider: explicitProvider,
  }: SMSJobData): Promise<SMSResult | void> {
    if (!to?.trim() || !body?.trim()) {
      Logger.warn('NotificationSmsQueueService: Missing phone number or message body.');
      return;
    }
    // Re-assert at the worker boundary to catch plan downgrades during queue delay.
    await NotificationSmsQueueService.assertSmsFeatureAccess(tenantId);

    const parsed = NotificationSmsProviderService.parsePhoneNumber(to);
    if (!parsed) {
      Logger.error(`NotificationSmsQueueService: Invalid phone number format for ${to}`);
      return;
    }
    const { number, regionCode } = parsed;

    if (!NotificationSmsProviderService.isAllowedCountry(regionCode)) {
      Logger.error(`NotificationSmsQueueService: Country ${regionCode} is not allowed for number: ${to}`);
      return;
    }

    const provider = explicitProvider
      ? await NotificationSmsProviderService.getProvider(tenantId, explicitProvider)
      : await NotificationSmsProviderService.getProviderForRegion(tenantId, regionCode);

    let result: SMSResult;
    try {
      result = await provider.sendShortMessage(tenantId, { to: number, body });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await NotificationLogService.log(tenantId, 'sms', number, 'failed', { provider: provider.name, error: message });
      throw err;
    }

    if (result?.success) {
      await TenantUsageService.incrementSmsSends(tenantId, 1);
      await NotificationLogService.log(tenantId, 'sms', number, 'sent', {
        provider: provider.name, providerMessageId: result.messageId,
      });
    } else {
      await NotificationLogService.log(tenantId, 'sms', number, 'failed', {
        provider: provider.name, error: result?.error,
      });
    }
    return result;
  }
}
