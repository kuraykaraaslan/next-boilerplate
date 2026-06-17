import { env } from '@kuraykaraaslan/env';
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import Logger from "@kuraykaraaslan/logger";
import SettingService from "@kuraykaraaslan/setting/server/setting.service";
import BaseSMSProvider, { SMSOptions, SMSResult } from '@kuraykaraaslan/notification_sms/server/providers/base.provider';

interface NetGSMCreds {
  userCode: string;
  password: string;
  header: string;
}

export default class NetGSMProvider extends BaseSMSProvider {
  readonly name = "NetGSM";

  // Cache one axios client per tenant.
  private clients = new Map<string, AxiosInstance>();

  /**
   * Resolve NetGSM credentials for `tenantId` from SettingService with env
   * fallback. The keys map 1:1 to notification_sms.setting.keys.ts.
   */
  private async resolveCreds(tenantId: string): Promise<NetGSMCreds> {
    const [userCode, password, header] = await Promise.all([
      SettingService.getValue(tenantId, 'netgsmUserCode'),
      SettingService.getValue(tenantId, 'netgsmPassword'),
      SettingService.getValue(tenantId, 'netgsmPhoneNumber'),
    ]);
    return {
      userCode: userCode ?? env.NETGSM_USER_CODE ?? '',
      password: password ?? env.NETGSM_PASSWORD ?? '',
      header: header ?? env.NETGSM_PHONE_NUMBER ?? '',
    };
  }

  private getClient(tenantId: string): AxiosInstance {
    const cached = this.clients.get(tenantId);
    if (cached) return cached;
    const client = axios.create({
      baseURL: "https://api.netgsm.com.tr/sms/send/get",
      headers: { "Content-Type": "multipart/form-data" },
    });
    this.clients.set(tenantId, client);
    return client;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.resolveCreds(tenantId);
    return !!(c.userCode && c.password && c.header);
  }

  async sendShortMessage(tenantId: string, options: SMSOptions): Promise<SMSResult> {
    const creds = await this.resolveCreds(tenantId);
    if (!creds.userCode || !creds.password || !creds.header) {
      Logger.error("NetGSM: Provider is not configured");
      return { success: false, error: "NetGSM provider is not configured" };
    }

    if (!options.to?.trim() || !options.body?.trim()) {
      Logger.info("NetGSM: Missing phone number or message body.");
      return { success: false, error: "Missing phone number or body" };
    }

    const formData = new FormData();
    formData.append("usercode", creds.userCode);
    formData.append("password", creds.password);
    formData.append("gsmno", options.to);
    formData.append("message", options.body);
    formData.append("msgheader", creds.header);
    formData.append("filter", "0");

    try {
      const response = await this.getClient(tenantId).post("", formData, {
        headers: formData.getHeaders?.() || {},
      });
      const data = response.data;

      if (typeof data === "string" && (data.startsWith("00") || /^\d{9,}$/.test(data))) {
        Logger.info(`NetGSM: Message sent successfully to ${options.to}. Response: ${data}`);
        return { success: true, messageId: String(data) };
      }

      const err = `Failed response: ${data}`;
      Logger.error(`NetGSM: ${err} for ${options.to}`);
      return { success: false, error: err };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`NetGSM error sending to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
