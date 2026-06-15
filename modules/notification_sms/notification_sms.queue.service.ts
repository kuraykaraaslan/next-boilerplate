import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/modules/redis/redis.bullmq';
import redis from '@/modules/redis';
import SettingService from '@/modules/setting/setting.service';
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';
import NotificationLogService from '@/modules/notification_log/notification_log.service';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import type { SMSResult } from './providers/base.provider';
import NotificationSmsProviderService, { type SMSProviderType } from './notification_sms.provider.service';
import { RedisIdempotencyService } from '@/modules/redis_idempotency';

interface SMSJobData {
  tenantId: string;
  to: string;
  body: string;
  provider?: SMSProviderType;
  idempotencyKey?: string;
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
      const { tenantId, to, body, provider, idempotencyKey } = job.data;
      Logger.info(`SMS Worker ${job.id} processing...`);
      // Guard worker retries from re-sending an already-delivered SMS.
      await RedisIdempotencyService.run(tenantId, idempotencyKey, () =>
        NotificationSmsQueueService._sendShortMessage({ tenantId, to, body, provider }),
      );
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

  // ── Per-tenant enable toggle + opt-out (STOP keyword) suppression ─────────

  private static optOutKey(tenantId: string): string {
    return `sms:optout:${tenantId}`;
  }

  /** Whether SMS is enabled for the tenant (`smsEnabled` setting, default on). */
  static async isSmsEnabled(tenantId: string): Promise<boolean> {
    const raw = await SettingService.getValue(tenantId, 'smsEnabled').catch(() => null);
    return raw !== 'false';
  }

  static async isOptedOut(tenantId: string, to: string): Promise<boolean> {
    return (await redis.sismember(NotificationSmsQueueService.optOutKey(tenantId), to).catch(() => 0)) === 1;
  }

  static async recordOptOut(tenantId: string, to: string): Promise<void> {
    await redis.sadd(NotificationSmsQueueService.optOutKey(tenantId), to).catch(() => {});
  }

  static async recordOptIn(tenantId: string, to: string): Promise<void> {
    await redis.srem(NotificationSmsQueueService.optOutKey(tenantId), to).catch(() => {});
  }

  /**
   * Handle an inbound SMS keyword (carrier reply). STOP/UNSUBSCRIBE/IPTAL opts
   * the sender out; START/UNSTOP opts back in. Returns the action taken.
   */
  static async handleInboundKeyword(tenantId: string, from: string, text: string): Promise<'opted_out' | 'opted_in' | 'none'> {
    const kw = text.trim().toUpperCase();
    if (['STOP', 'UNSUBSCRIBE', 'IPTAL', 'DUR'].includes(kw)) {
      await NotificationSmsQueueService.recordOptOut(tenantId, from);
      return 'opted_out';
    }
    if (['START', 'UNSTOP', 'BASLA'].includes(kw)) {
      await NotificationSmsQueueService.recordOptIn(tenantId, from);
      return 'opted_in';
    }
    return 'none';
  }

  /** Tenant disabled SMS or recipient opted out → must not send. */
  private static async isSuppressed(tenantId: string, to: string): Promise<boolean> {
    if (!(await NotificationSmsQueueService.isSmsEnabled(tenantId))) {
      Logger.info(`[sms] suppressed: SMS disabled for tenant ${tenantId}`);
      return true;
    }
    if (await NotificationSmsQueueService.isOptedOut(tenantId, to)) {
      Logger.info(`[sms] suppressed: ${to} has opted out (STOP)`);
      return true;
    }
    return false;
  }

  static async sendShortMessage(
    tenantId: string,
    { to, body, provider, idempotencyKey }: { to: string; body: string; provider?: SMSProviderType; idempotencyKey?: string },
  ): Promise<void> {
    if (!to?.trim() || !body?.trim()) {
      Logger.warn('NotificationSmsQueueService: Missing phone number or message body.');
      return;
    }
    await NotificationSmsQueueService.assertSmsFeatureAccess(tenantId);
    if (await NotificationSmsQueueService.isSuppressed(tenantId, to)) return;
    try {
      const rateLimitKey = `${NotificationSmsQueueService.RATE_LIMIT_PREFIX}${tenantId}:${to}`;
      const existing = await redis.get(rateLimitKey);
      if (existing) {
        Logger.warn(`NotificationSmsQueueService: Rate limit hit for ${to}. Message not queued.`);
        return;
      }
      await redis.set(rateLimitKey, '1', 'EX', NotificationSmsQueueService.RATE_LIMIT_SECONDS);
      await NotificationSmsQueueService.QUEUE.add('sendShortMessage', { tenantId, to, body, provider, idempotencyKey },
        idempotencyKey ? { jobId: `sms:${tenantId}:${idempotencyKey}` } : undefined);
      Logger.info(`NotificationSmsQueueService: Queued SMS to ${to}`);
    } catch (error: unknown) {
      Logger.error(`NotificationSmsQueueService.sendShortMessage error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendShortMessageDirect(
    tenantId: string,
    { to, body, provider, idempotencyKey }: { to: string; body: string; provider?: SMSProviderType; idempotencyKey?: string },
  ): Promise<SMSResult | void> {
    await NotificationSmsQueueService.assertSmsFeatureAccess(tenantId);
    return RedisIdempotencyService.run(tenantId, idempotencyKey, () =>
      NotificationSmsQueueService._sendShortMessage({ tenantId, to, body, provider }),
    );
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

    // Opt-out / disable can change between enqueue and delivery — re-check.
    if (await NotificationSmsQueueService.isSuppressed(tenantId, number)) return;

    if (!(await NotificationSmsProviderService.isAllowedCountryForTenant(tenantId, regionCode))) {
      Logger.error(`NotificationSmsQueueService: Country ${regionCode} is not allowed for number: ${to}`);
      return;
    }

    const provider = explicitProvider
      ? await NotificationSmsProviderService.getProvider(tenantId, explicitProvider)
      : await NotificationSmsProviderService.getProviderForRegion(tenantId, regionCode);

    const { default: NotificationSmsDeliveryService } = await import('./notification_sms.delivery.service');

    // Circuit breaker: skip a provider that has been failing (cooldown window).
    if (!(await NotificationSmsDeliveryService.isProviderHealthy(tenantId, provider.name))) {
      Logger.warn(`[sms] provider ${provider.name} breaker open — skipping send to ${number}`);
      await NotificationLogService.log(tenantId, 'sms', number, 'failed', { provider: provider.name, error: 'provider_circuit_open' });
      return { success: false, error: 'provider_circuit_open' };
    }

    let result: SMSResult;
    try {
      result = await provider.sendShortMessage(tenantId, { to: number, body });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await NotificationSmsDeliveryService.recordProviderResult(tenantId, provider.name, false);
      await NotificationLogService.log(tenantId, 'sms', number, 'failed', { provider: provider.name, error: message });
      throw err;
    }

    await NotificationSmsDeliveryService.recordProviderResult(tenantId, provider.name, Boolean(result?.success));
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
