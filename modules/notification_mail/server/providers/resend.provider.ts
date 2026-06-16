import { env } from '@nb/env';
import axios, { AxiosInstance } from "axios";
import Logger from "@nb/logger";
import SettingService from "@nb/setting/server/setting.service";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class ResendProvider extends BaseMailProvider {
  readonly name = "Resend";

  private static readonly RESEND_BASE_URL = "https://api.resend.com";

  private axiosByTenant = new Map<string, { key: string; instance: AxiosInstance }>();

  private async getApiKey(tenantId: string): Promise<string | null> {
    const tenantKey = await SettingService.getValue(tenantId, 'resendApiKey');
    return tenantKey ?? env.RESEND_API_KEY ?? null;
  }

  private async getAxiosInstance(tenantId: string): Promise<AxiosInstance | null> {
    const apiKey = await this.getApiKey(tenantId);
    if (!apiKey) return null;
    const cached = this.axiosByTenant.get(tenantId);
    if (cached && cached.key === apiKey) return cached.instance;
    const instance = axios.create({
      baseURL: ResendProvider.RESEND_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    this.axiosByTenant.set(tenantId, { key: apiKey, instance });
    return instance;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    return Boolean(await this.getApiKey(tenantId));
  }

  async sendMail(tenantId: string, options: MailOptions): Promise<MailResult> {
    const client = await this.getAxiosInstance(tenantId);
    if (!client) {
      Logger.error("Resend: Provider is not configured");
      return { success: false, error: "Resend provider is not configured" };
    }

    const payload: Record<string, unknown> = {
      from: options.from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    };

    if (options.replyTo) {
      payload.reply_to = [options.replyTo];
    }

    if (options.cc?.length) {
      payload.cc = options.cc;
    }

    if (options.bcc?.length) {
      payload.bcc = options.bcc;
    }

    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content.toString("base64")
          : Buffer.from(att.content).toString("base64"),
        content_type: att.contentType,
      }));
    }

    try {
      const response = await client.post("/emails", payload);

      if (response.status === 200) {
        Logger.info(`Resend: Email sent successfully to ${options.to}`);
        return { success: true, messageId: response.data.id };
      }

      return { success: false, error: `Unexpected status: ${response.status}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Resend: Failed to send email to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
