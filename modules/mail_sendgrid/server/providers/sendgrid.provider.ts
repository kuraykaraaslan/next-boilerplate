import { env } from '@nb/env';
import axios, { AxiosInstance } from "axios";
import Logger from "@nb/logger";
import SettingService from "@nb/setting/server/setting.service";
import BaseMailProvider, { MailOptions, MailResult } from '@nb/notification_mail/server/providers/base.provider';

export default class SendGridProvider extends BaseMailProvider {
  readonly name = "SendGrid";

  private static readonly SENDGRID_BASE_URL = "https://api.sendgrid.com/v3";

  /**
   * Resolve the SendGrid API key for `tenantId` with env fallback.
   */
  private async resolveApiKey(tenantId: string): Promise<string | null> {
    return (await SettingService.getValue(tenantId, 'sendgridApiKey')) ?? env.SENDGRID_API_KEY ?? null;
  }

  private buildClient(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: SendGridProvider.SENDGRID_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    return !!(await this.resolveApiKey(tenantId));
  }

  async sendMail(tenantId: string, options: MailOptions): Promise<MailResult> {
    const apiKey = await this.resolveApiKey(tenantId);
    if (!apiKey) {
      Logger.error("SendGrid: Provider is not configured");
      return { success: false, error: "SendGrid provider is not configured" };
    }

    const payload = {
      personalizations: [
        {
          to: [{ email: options.to }],
          ...(options.cc?.length && { cc: options.cc.map((email) => ({ email })) }),
          ...(options.bcc?.length && { bcc: options.bcc.map((email) => ({ email })) }),
        },
      ],
      from: { email: options.from },
      ...(options.replyTo && { reply_to: { email: options.replyTo } }),
      subject: options.subject,
      content: [{ type: "text/html", value: options.html }],
      ...(options.attachments?.length && {
        attachments: options.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString("base64")
            : Buffer.from(att.content).toString("base64"),
          type: att.contentType || "application/octet-stream",
        })),
      }),
    };

    try {
      const response = await this.buildClient(apiKey).post("/mail/send", payload);

      if (response.status === 202) {
        Logger.info(`SendGrid: Email sent successfully to ${options.to}`);
        return {
          success: true,
          messageId: response.headers["x-message-id"],
        };
      }

      return { success: false, error: `Unexpected status: ${response.status}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`SendGrid: Failed to send email to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
