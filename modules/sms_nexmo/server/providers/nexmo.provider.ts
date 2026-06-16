import { env } from '@nb/env';
import axios, { AxiosInstance } from "axios";
import qs from "qs";
import Logger from "@nb/logger";
import SettingService from "@nb/setting/server/setting.service";
import BaseSMSProvider, { SMSOptions, SMSResult } from '@nb/notification_sms/server/providers/base.provider';

interface NexmoCreds {
  apiKey: string;
  apiSecret: string;
  fromPhone: string;
}

export default class NexmoProvider extends BaseSMSProvider {
  readonly name = "Nexmo";

  // Cache one axios client per tenant.
  private clients = new Map<string, AxiosInstance>();

  /**
   * Resolve Nexmo (Vonage) credentials for `tenantId` from SettingService
   * with env fallback. The keys map 1:1 to notification_sms.setting.keys.ts.
   */
  private async resolveCreds(tenantId: string): Promise<NexmoCreds> {
    const [apiKey, apiSecret, fromPhone] = await Promise.all([
      SettingService.getValue(tenantId, 'nexmoApiKey'),
      SettingService.getValue(tenantId, 'nexmoApiSecret'),
      SettingService.getValue(tenantId, 'nexmoPhoneNumber'),
    ]);
    return {
      apiKey: apiKey ?? env.NEXMO_API_KEY ?? '',
      apiSecret: apiSecret ?? env.NEXMO_API_SECRET ?? '',
      fromPhone: fromPhone ?? env.NEXMO_PHONE_NUMBER ?? '',
    };
  }

  private getClient(tenantId: string): AxiosInstance {
    const cached = this.clients.get(tenantId);
    if (cached) return cached;
    const client = axios.create({
      baseURL: "https://rest.nexmo.com/sms/json",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    this.clients.set(tenantId, client);
    return client;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.resolveCreds(tenantId);
    return !!(c.apiKey && c.apiSecret && c.fromPhone);
  }

  async sendShortMessage(tenantId: string, options: SMSOptions): Promise<SMSResult> {
    const creds = await this.resolveCreds(tenantId);
    if (!creds.apiKey || !creds.apiSecret || !creds.fromPhone) {
      Logger.error("Nexmo: Provider is not configured");
      return { success: false, error: "Nexmo provider is not configured" };
    }

    if (!options.to || !options.body) {
      Logger.info("Nexmo: Missing phone number or message body.");
      return { success: false, error: "Missing phone number or body" };
    }

    const payload = qs.stringify({
      api_key: creds.apiKey,
      api_secret: creds.apiSecret,
      to: options.to,
      from: creds.fromPhone,
      text: options.body,
    });

    try {
      const response = await this.getClient(tenantId).post("", payload);
      const messages = response.data?.messages;
      const message = messages?.[0];

      if (message && message.status === "0") {
        Logger.info(`Nexmo: Message sent successfully to ${options.to}`);
        return { success: true, messageId: message["message-id"] };
      }

      const err = message?.["error-text"] || "Unknown error";
      Logger.error(`Nexmo error to ${options.to}: ${err}`);
      return { success: false, error: err };
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Nexmo SMS error to ${options.to}: ${errMessage}`);
      return { success: false, error: errMessage };
    }
  }
}
