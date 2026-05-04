import { env } from '@/libs/env';
import Logger from "@/libs/logger";
import { Queue, Worker, Job } from "bullmq";
import { getBullMQConnection } from "@/libs/redis/bullmq";
import redis from "@/libs/redis";
import { PhoneNumberUtil, PhoneNumberFormat } from "google-libphonenumber";

// Providers
import BaseProvider from "./providers/base.provider";
import TwilioProvider from "./providers/twilio.provider";
import NetGSMProvider from "./providers/netgsm.provider";
import ClickatellProvider from "./providers/clickatell.provider";
import NexmoProvider from "./providers/nexmo.provider";

export type SMSProviderType = "twilio" | "netgsm" | "clickatell" | "nexmo";

interface SMSJobData {
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
  private static readonly PROVIDERS = new Map<SMSProviderType, BaseProvider>([
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
      const { to, body } = job.data;
      Logger.info(`SMS Worker ${job.id} processing...`);
      await SMSService._sendShortMessage({ to, body });
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
   * Get provider instance by name
   */
  static getProvider(providerName?: SMSProviderType): BaseProvider {
    const name = providerName || SMSService.DEFAULT_PROVIDER_NAME;
    const provider = SMSService.PROVIDERS.get(name);

    if (!provider) {
      Logger.warn(`SMSService: Unknown provider "${name}", falling back to default`);
      return SMSService.PROVIDERS.get(SMSService.DEFAULT_PROVIDER_NAME)!;
    }

    return provider;
  }

  /**
   * Get default provider instance
   */
  static getDefaultProvider(): BaseProvider {
    return SMSService.PROVIDERS.get(SMSService.DEFAULT_PROVIDER_NAME)!;
  }

  /**
   * List all available providers
   */
  static listProviders(): SMSProviderType[] {
    return Array.from(SMSService.PROVIDERS.keys());
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
   * Queue an SMS message for delivery.
   * Delivery failures are logged but never propagated to the caller.
   */
  static async sendShortMessage({
    to,
    body,
    provider
  }: {
    to: string;
    body: string;
    provider?: SMSProviderType;
  }): Promise<void> {
    try {
      if (!to?.trim() || !body?.trim()) {
        Logger.warn("SMSService: Missing phone number or message body.");
        return;
      }

      const rateLimitKey = `${SMSService.RATE_LIMIT_PREFIX}${to}`;
      const existing = await redis.get(rateLimitKey);

      if (existing) {
        Logger.warn(`SMSService: Rate limit hit for ${to}. Message not queued.`);
        return;
      }

      await redis.set(rateLimitKey, "1", "EX", SMSService.RATE_LIMIT_SECONDS);
      await SMSService.QUEUE.add("sendShortMessage", { to, body, provider });
      Logger.info(`SMSService: Queued SMS to ${to}`);
    } catch (error: unknown) {
      Logger.error(`SMSService.sendShortMessage error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Send SMS directly without queue (for urgent messages)
   */
  static async sendShortMessageDirect({
    to,
    body,
    provider
  }: {
    to: string;
    body: string;
    provider?: SMSProviderType;
  }): Promise<void> {
    return SMSService._sendShortMessage({ to, body, provider });
  }

  /**
   * Internal method to send SMS via appropriate provider
   */
  private static async _sendShortMessage({
    to,
    body,
    provider: explicitProvider
  }: SMSJobData): Promise<void> {
    if (!to?.trim() || !body?.trim()) {
      Logger.warn("SMSService: Missing phone number or message body.");
      return;
    }

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

    // Use explicit provider if specified, otherwise get by region
    const provider = explicitProvider
      ? SMSService.getProvider(explicitProvider)
      : SMSService.getProviderForRegion(regionCode);

    await provider.sendShortMessage(number, body);
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
   * Get the appropriate provider for a region
   */
  static getProviderForRegion(regionCode: string): BaseProvider {
    const providerName = SMSService.REGION_PROVIDER_MAP.get(regionCode.toUpperCase());

    if (providerName) {
      const provider = SMSService.PROVIDERS.get(providerName);
      if (provider) {
        return provider;
      }
    }

    Logger.warn(`SMSService: No specific provider for ${regionCode}. Using default (${SMSService.DEFAULT_PROVIDER_NAME}).`);
    return SMSService.getDefaultProvider();
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
