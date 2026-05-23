import { env } from '@/modules/env';
import Logger from "@/modules/logger";
import { Queue, Worker, Job } from "bullmq";
import { getBullMQConnection } from "@/modules/redis/redis.bullmq";
import redis from "@/modules/redis";
import { PhoneNumberUtil, PhoneNumberFormat } from "google-libphonenumber";
import { TenantUsageService } from "@/modules/tenant_usage/tenant_usage.service";
import NotificationLogService from "@/modules/notification_log/notification_log.service";
import TenantSubscriptionService from "@/modules/tenant_subscription/tenant_subscription.service";
import { FEATURE_KEYS } from "@/modules/tenant_subscription/tenant_subscription.feature-keys";
import { isRootTenant } from "@/modules/tenant/tenant.constants";

// Providers
import BaseSMSProvider, { SMSResult } from "./providers/base.provider";
import TwilioProvider from "./providers/twilio.provider";
import NetGSMProvider from "./providers/netgsm.provider";
import ClickatellProvider from "./providers/clickatell.provider";
import NexmoProvider from "./providers/nexmo.provider";

export type SMSProviderType = "twilio" | "netgsm" | "clickatell" | "nexmo";

interface SMSJobData {
  tenantId: string;
  to: string;
  body: string;
  provider?: SMSProviderType;
}

export default class SMSService {
  private static _initialized = false;

  static readonly phoneLibInstance = PhoneNumberUtil.getInstance();

  static readonly QUEUE_NAME = "smsQueue";
  static readonly RATE_LIMIT_SECONDS = env.SMS_RATE_LIMIT_SECONDS ?? 60;
  static readonly RATE_LIMIT_PREFIX = "sms:rate-limit:";

  static readonly ALLOWED_COUNTRIES = env.SMS_ALLOWED_COUNTRIES?.split(",").map(c => c.trim());

  // Provider instances
  private static readonly twilioProvider = new TwilioProvider();
  private static readonly netgsmProvider = new NetGSMProvider();
  private static readonly clickatellProvider = new ClickatellProvider();
  private static readonly nexmoProvider = new NexmoProvider();

  // Provider name to instance mapping
  private static readonly PROVIDER_MAP = new Map<SMSProviderType, BaseSMSProvider>([
    ["twilio", SMSService.twilioProvider],
    ["netgsm", SMSService.netgsmProvider],
    ["clickatell", SMSService.clickatellProvider],
    ["nexmo", SMSService.nexmoProvider],
  ]);

  // Default provider from env or fallback to twilio
  private static readonly DEFAULT_PROVIDER_NAME: SMSProviderType =
    (env.SMS_DEFAULT_PROVIDER as SMSProviderType) || "twilio";

  /**
   * Region code to provider mapping
   * Can be configured via env: SMS_PROVIDER_MAP="TR:netgsm,US:twilio,GB:twilio"
   */
  private static readonly REGION_PROVIDER_MAP: Map<string, SMSProviderType> = SMSService.buildRegionProviderMap();

  private static buildRegionProviderMap(): Map<string, SMSProviderType> {
    const map = new Map<string, SMSProviderType>();
    const envMap = env.SMS_PROVIDER_MAP;

    if (envMap) {
      // Parse from env: "TR:netgsm,US:twilio,GB:twilio,DE:twilio"
      const pairs = envMap.split(",").map(p => p.trim());
      for (const pair of pairs) {
        const [region, provider] = pair.split(":").map(s => s.trim());
        if (region && provider && SMSService.isValidProviderName(provider)) {
          map.set(region.toUpperCase(), provider as SMSProviderType);
        }
      }
    } else {
      // Default mapping if not configured
      map.set("TR", "netgsm");
      map.set("US", "twilio");
      map.set("GB", "twilio");
      map.set("DE", "twilio");
      map.set("FR", "twilio");
    }

    return map;
  }

  private static isValidProviderName(name: string): boolean {
    return ["twilio", "netgsm", "clickatell", "nexmo"].includes(name.toLowerCase());
  }

  static readonly APPLICATION_NAME = env.APPLICATION_NAME || "Next Boilerplate";

  static readonly QUEUE = new Queue<SMSJobData>(SMSService.QUEUE_NAME, {
    connection: getBullMQConnection(),
  });

  static readonly WORKER = new Worker<SMSJobData>(
    SMSService.QUEUE_NAME,
    async (job: Job<SMSJobData>) => {
      const { tenantId, to, body, provider } = job.data;
      Logger.info(`SMS Worker ${job.id} processing...`);
      await SMSService._sendShortMessage({ tenantId, to, body, provider });
    },
    {
      connection: getBullMQConnection(),
    }
  );

  static {
    if (!SMSService._initialized) {
      SMSService.WORKER.on("completed", (job: Job<SMSJobData>) => {
        Logger.info(`SMS Worker ${job.id} completed`);
      });

      SMSService.WORKER.on("failed", (job: Job<SMSJobData> | undefined, err: Error) => {
        Logger.error(`SMS Worker ${job?.id ?? "unknown"} failed: ${err.message}`);
      });

      SMSService._initialized = true;
    }
  }

  /**
   * Get the provider instance for a tenant by name, falling back through the
   * tenant's configured providers when the requested one is missing creds.
   */
  static async getProvider(tenantId: string, providerName?: SMSProviderType): Promise<BaseSMSProvider> {
    const name = providerName || SMSService.DEFAULT_PROVIDER_NAME;
    const provider = SMSService.PROVIDER_MAP.get(name);

    if (!provider) {
      Logger.warn(`SMSService: Unknown provider "${name}", falling back to default`);
      return SMSService.PROVIDER_MAP.get(SMSService.DEFAULT_PROVIDER_NAME)!;
    }

    if (!(await provider.isConfigured(tenantId))) {
      Logger.warn(`SMSService: Provider "${name}" is not configured for tenant ${tenantId}, trying fallback`);
      for (const [, p] of SMSService.PROVIDER_MAP) {
        if (await p.isConfigured(tenantId)) {
          Logger.info(`SMSService: Using fallback provider "${p.name}"`);
          return p;
        }
      }
    }

    return provider;
  }

  /**
   * List all available providers for a tenant with their configured state.
   */
  static async listProviders(tenantId: string): Promise<{ name: SMSProviderType; configured: boolean }[]> {
    const result: { name: SMSProviderType; configured: boolean }[] = [];
    for (const [name, provider] of SMSService.PROVIDER_MAP) {
      result.push({ name, configured: await provider.isConfigured(tenantId) });
    }
    return result;
  }

  /**
   * Get current region to provider mapping
   */
  static getRegionProviderMap(): Record<string, SMSProviderType> {
    const result: Record<string, SMSProviderType> = {};
    for (const [region, provider] of SMSService.REGION_PROVIDER_MAP) {
      result[region] = provider;
    }
    return result;
  }

  /**
   * Queue an SMS message for delivery (tenant-scoped — the worker reads each
   * tenant's provider config when the job runs).
   * Delivery failures are logged but never propagated to the caller.
   */
  /**
   * Defense-in-depth billing gate for outbound SMS. Asserts the tenant's
   * active plan grants `feature_sms_send` (BOOLEAN) and is below the
   * `feature_sms_monthly_quota` LIMIT for the current month
   * (TenantUsage.smsSends).
   *
   * Root tenant is short-circuited. Best-effort — LIMIT check is not atomic.
   */
  static async assertSmsFeatureAccess(tenantId: string): Promise<void> {
    if (isRootTenant(tenantId)) return;

    await TenantSubscriptionService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_SMS_SEND);

    const usage = await TenantUsageService.getUsage(tenantId);
    await TenantSubscriptionService.assertFeatureAccess(
      tenantId,
      FEATURE_KEYS.FEATURE_SMS_MONTHLY_QUOTA,
      usage.smsSends,
    );
  }

  static async sendShortMessage(
    tenantId: string,
    {
      to,
      body,
      provider,
    }: {
      to: string;
      body: string;
      provider?: SMSProviderType;
    }
  ): Promise<void> {
    try {
      if (!to?.trim() || !body?.trim()) {
        Logger.warn("SMSService: Missing phone number or message body.");
        return;
      }

      await SMSService.assertSmsFeatureAccess(tenantId);

      const rateLimitKey = `${SMSService.RATE_LIMIT_PREFIX}${to}`;
      const existing = await redis.get(rateLimitKey);

      if (existing) {
        Logger.warn(`SMSService: Rate limit hit for ${to}. Message not queued.`);
        return;
      }

      await redis.set(rateLimitKey, "1", "EX", SMSService.RATE_LIMIT_SECONDS);
      await SMSService.QUEUE.add("sendShortMessage", { tenantId, to, body, provider });
      Logger.info(`SMSService: Queued SMS to ${to}`);
    } catch (error: unknown) {
      Logger.error(`SMSService.sendShortMessage error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Send SMS directly without queue (for urgent messages)
   */
  static async sendShortMessageDirect(
    tenantId: string,
    {
      to,
      body,
      provider,
    }: {
      to: string;
      body: string;
      provider?: SMSProviderType;
    }
  ): Promise<SMSResult | void> {
    await SMSService.assertSmsFeatureAccess(tenantId);
    return SMSService._sendShortMessage({ tenantId, to, body, provider });
  }

  /**
   * Internal method to send SMS via appropriate provider for this tenant.
   */
  private static async _sendShortMessage({
    tenantId,
    to,
    body,
    provider: explicitProvider,
  }: SMSJobData): Promise<SMSResult | void> {
    if (!to?.trim() || !body?.trim()) {
      Logger.warn("SMSService: Missing phone number or message body.");
      return;
    }

    // Re-assert at the worker boundary so a long-queued job cannot bypass
    // gating after the tenant's plan was downgraded / cancelled.
    await SMSService.assertSmsFeatureAccess(tenantId);

    const parsed = SMSService.parsePhoneNumber(to);

    if (!parsed) {
      Logger.error(`SMSService: Invalid phone number format for ${to}`);
      return;
    }

    const { number, regionCode } = parsed;

    if (!SMSService.isAllowedCountry(regionCode)) {
      Logger.error(`SMSService: Country ${regionCode} is not allowed for number: ${to}`);
      return;
    }

    // Resolve provider: explicit > region default > tenant fallback chain
    const provider = explicitProvider
      ? await SMSService.getProvider(tenantId, explicitProvider)
      : await SMSService.getProviderForRegion(tenantId, regionCode);

    let result: SMSResult;
    try {
      result = await provider.sendShortMessage(tenantId, { to: number, body });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await NotificationLogService.log(tenantId, 'sms', number, 'failed', {
        provider: provider.name,
        error: message,
      });
      throw err;
    }

    if (result?.success) {
      await TenantUsageService.incrementSmsSends(tenantId, 1);
      await NotificationLogService.log(tenantId, 'sms', number, 'sent', {
        provider: provider.name,
        providerMessageId: result.messageId,
      });
    } else {
      await NotificationLogService.log(tenantId, 'sms', number, 'failed', {
        provider: provider.name,
        error: result?.error,
      });
    }

    return result;
  }

  /**
   * Parse phone number and extract region code
   */
  static parsePhoneNumber(phoneNumber: string): { number: string; regionCode: string } | null {
    try {
      const parsedNumber = SMSService.phoneLibInstance.parse(phoneNumber);
      const regionCode = SMSService.phoneLibInstance.getRegionCodeForNumber(parsedNumber);

      if (!regionCode) {
        Logger.error(`SMSService: Unable to get region code for number: ${phoneNumber}`);
        return null;
      }

      const number = SMSService.phoneLibInstance.format(parsedNumber, PhoneNumberFormat.E164);

      return { number, regionCode };
    } catch (error) {
      Logger.error(`SMSService: Error parsing phone number ${phoneNumber}: ${error}`);
      return null;
    }
  }

  /**
   * Check if a country is allowed for SMS
   */
  static isAllowedCountry(regionCode: string): boolean {
    if (!SMSService.ALLOWED_COUNTRIES || SMSService.ALLOWED_COUNTRIES.length === 0) {
      return true; // No restrictions
    }
    return SMSService.ALLOWED_COUNTRIES.includes(regionCode);
  }

  /**
   * Get the appropriate provider for a region, falling back through this
   * tenant's configured providers when the region default is not configured.
   */
  static async getProviderForRegion(tenantId: string, regionCode: string): Promise<BaseSMSProvider> {
    const providerName = SMSService.REGION_PROVIDER_MAP.get(regionCode.toUpperCase());

    if (providerName) {
      return SMSService.getProvider(tenantId, providerName);
    }

    Logger.warn(`SMSService: No specific provider for ${regionCode}. Using default (${SMSService.DEFAULT_PROVIDER_NAME}).`);
    return SMSService.getProvider(tenantId);
  }

  /**
   * Validate a phone number format
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    try {
      const parsedNumber = SMSService.phoneLibInstance.parse(phoneNumber);
      return SMSService.phoneLibInstance.isValidNumber(parsedNumber);
    } catch {
      return false;
    }
  }
}
