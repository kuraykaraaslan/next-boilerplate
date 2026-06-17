import { env } from '@kuraykaraaslan/env';
import axios, { AxiosInstance } from "axios";
import Logger from "@kuraykaraaslan/logger";
import SettingService from "@kuraykaraaslan/setting/server/setting.service";
import BaseSMSProvider, { SMSOptions, SMSResult } from '@kuraykaraaslan/notification_sms/server/providers/base.provider';

interface ClickatellCreds {
  apiKey: string;
}

export default class ClickatellProvider extends BaseSMSProvider {
  readonly name = "Clickatell";

  // Cache one axios client per tenant.
  private clients = new Map<string, AxiosInstance>();

  /**
   * Resolve Clickatell credentials for `tenantId` from SettingService with
   * env fallback. The keys map 1:1 to notification_sms.setting.keys.ts.
   */
  private async resolveCreds(tenantId: string): Promise<ClickatellCreds> {
    const apiKey = await SettingService.getValue(tenantId, 'clickatellApiKey');
    return {
      apiKey: apiKey ?? env.CLICKATELL_API_KEY ?? '',
    };
  }

  private getClient(tenantId: string, creds: ClickatellCreds): AxiosInstance {
    const cached = this.clients.get(tenantId);
    if (cached) return cached;
    const client = axios.create({
      baseURL: "https://platform.clickatell.com/messages",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    this.clients.set(tenantId, client);
    return client;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.resolveCreds(tenantId);
    return !!c.apiKey;
  }

  async sendShortMessage(tenantId: string, options: SMSOptions): Promise<SMSResult> {
    const creds = await this.resolveCreds(tenantId);
    if (!creds.apiKey) {
      Logger.error("Clickatell: Provider is not configured");
      return { success: false, error: "Clickatell provider is not configured" };
    }

    if (!options.to || !options.body) {
      Logger.info("Clickatell: Missing phone number or message body.");
      return { success: false, error: "Missing phone number or body" };
    }

    const payload = {
      content: options.body,
      to: [options.to],
    };

    try {
      const response = await this.getClient(tenantId, creds).post("/chat", payload);
      if (response.status === 202) {
        Logger.info(`Clickatell: Message accepted for delivery to ${options.to}`);
        return { success: true, messageId: response.data?.messages?.[0]?.apiMessageId };
      }
      const err = `Unexpected response status: ${response.status}`;
      Logger.error(`Clickatell: ${err} for ${options.to}`);
      return { success: false, error: err };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Clickatell SMS error to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
