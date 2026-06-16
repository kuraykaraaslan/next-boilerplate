import { env } from '@nb/env';
import axios, { AxiosInstance } from "axios";
import qs from "qs";
import Logger from "@nb/logger";
import SettingService from "@nb/setting/server/setting.service";
import BaseSMSProvider, { SMSOptions, SMSResult } from "./base.provider";

interface TwilioCreds {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

export default class TwilioProvider extends BaseSMSProvider {
  readonly name = "Twilio";

  // Cache one axios client per tenant — credentials change rarely and a new
  // axios instance per send would be wasteful.
  private clients = new Map<string, AxiosInstance>();

  /**
   * Resolve Twilio credentials for `tenantId` from SettingService with env
   * fallback. The keys map 1:1 to notification_sms.setting.keys.ts.
   */
  private async resolveCreds(tenantId: string): Promise<TwilioCreds> {
    const [accountSid, authToken, fromPhone] = await Promise.all([
      SettingService.getValue(tenantId, 'twilioAccountSid'),
      SettingService.getValue(tenantId, 'twilioAuthToken'),
      SettingService.getValue(tenantId, 'twilioPhoneNumber'),
    ]);
    return {
      accountSid: accountSid ?? env.TWILIO_ACCOUNT_SID ?? '',
      authToken: authToken ?? env.TWILIO_AUTH_TOKEN ?? '',
      fromPhone: fromPhone ?? env.TWILIO_PHONE_NUMBER ?? '',
    };
  }

  private async getClient(tenantId: string, creds: TwilioCreds): Promise<AxiosInstance> {
    const cached = this.clients.get(tenantId);
    if (cached) return cached;
    const client = axios.create({
      baseURL: `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}`,
      auth: { username: creds.accountSid, password: creds.authToken },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    this.clients.set(tenantId, client);
    return client;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.resolveCreds(tenantId);
    return !!(c.accountSid && c.authToken && c.fromPhone);
  }

  async sendShortMessage(tenantId: string, options: SMSOptions): Promise<SMSResult> {
    const creds = await this.resolveCreds(tenantId);
    if (!creds.accountSid || !creds.authToken || !creds.fromPhone) {
      Logger.error("Twilio: Provider is not configured");
      return { success: false, error: "Twilio provider is not configured" };
    }

    if (!options.to || !options.body) {
      Logger.info("Twilio: Missing phone number or message body.");
      return { success: false, error: "Missing phone number or body" };
    }

    const payload = qs.stringify({
      From: creds.fromPhone,
      To: options.to,
      Body: options.body,
    });

    try {
      const client = await this.getClient(tenantId, creds);
      const response = await client.post("/Messages.json", payload);
      if (response.status === 201) {
        Logger.info(`Twilio: Message sent successfully to ${options.to}`);
        return { success: true, messageId: response.data?.sid };
      }
      const err = `Unexpected response status: ${response.status}`;
      Logger.error(`Twilio: ${err} for ${options.to}`);
      return { success: false, error: err };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Twilio SMS error to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
