import { env } from '@/modules/env';
import axios, { AxiosInstance } from "axios";
import Logger from "@/modules/logger";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class SendGridProvider extends BaseMailProvider {
  readonly name = "SendGrid";

  private static readonly SENDGRID_API_KEY = env.SENDGRID_API_KEY;
  private static readonly SENDGRID_BASE_URL = "https://api.sendgrid.com/v3";

  private axiosInstance: AxiosInstance | null = null;

  private getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      this.axiosInstance = axios.create({
        baseURL: SendGridProvider.SENDGRID_BASE_URL,
        headers: {
          Authorization: `Bearer ${SendGridProvider.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
    }
    return this.axiosInstance;
  }

  isConfigured(): boolean {
    return !!SendGridProvider.SENDGRID_API_KEY;
  }

  async sendMail(options: MailOptions): Promise<MailResult> {
    if (!this.isConfigured()) {
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
      const response = await this.getAxiosInstance().post("/mail/send", payload);

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
