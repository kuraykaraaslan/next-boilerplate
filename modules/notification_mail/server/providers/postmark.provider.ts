import { env } from '@nb/env';
import axios, { AxiosInstance } from "axios";
import Logger from "@nb/logger";
import SettingService from "@nb/setting/server/setting.service";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class PostmarkProvider extends BaseMailProvider {
  readonly name = "Postmark";

  private static readonly POSTMARK_BASE_URL = "https://api.postmarkapp.com";

  // Cache one axios instance per tenant. The API key changes rarely;
  // when it does, the corresponding entry is rebuilt on next send.
  private axiosByTenant = new Map<string, { key: string; instance: AxiosInstance }>();

  private async getApiKey(tenantId: string): Promise<string | null> {
    const tenantKey = await SettingService.getValue(tenantId, 'postmarkApiKey');
    return tenantKey ?? env.POSTMARK_API_KEY ?? null;
  }

  private async getAxiosInstance(tenantId: string): Promise<AxiosInstance | null> {
    const apiKey = await this.getApiKey(tenantId);
    if (!apiKey) return null;
    const cached = this.axiosByTenant.get(tenantId);
    if (cached && cached.key === apiKey) return cached.instance;
    const instance = axios.create({
      baseURL: PostmarkProvider.POSTMARK_BASE_URL,
      headers: {
        "X-Postmark-Server-Token": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
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
      Logger.error("Postmark: Provider is not configured");
      return { success: false, error: "Postmark provider is not configured" };
    }

    const payload: Record<string, unknown> = {
      From: options.from,
      To: options.to,
      Subject: options.subject,
      HtmlBody: options.html,
    };

    if (options.replyTo) {
      payload.ReplyTo = options.replyTo;
    }

    if (options.cc?.length) {
      payload.Cc = options.cc.join(",");
    }

    if (options.bcc?.length) {
      payload.Bcc = options.bcc.join(",");
    }

    if (options.attachments?.length) {
      payload.Attachments = options.attachments.map((att) => ({
        Name: att.filename,
        Content: Buffer.isBuffer(att.content)
          ? att.content.toString("base64")
          : Buffer.from(att.content).toString("base64"),
        ContentType: att.contentType || "application/octet-stream",
      }));
    }

    try {
      const response = await client.post("/email", payload);

      if (response.status === 200 && response.data.ErrorCode === 0) {
        Logger.info(`Postmark: Email sent successfully to ${options.to}`);
        return { success: true, messageId: response.data.MessageID };
      }

      return {
        success: false,
        error: response.data.Message || `Unexpected status: ${response.status}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Postmark: Failed to send email to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
