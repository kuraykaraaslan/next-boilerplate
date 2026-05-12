import { env } from '@/modules/env';
import axios, { AxiosInstance } from "axios";
import Logger from "@/modules/logger";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class PostmarkProvider extends BaseMailProvider {
  readonly name = "Postmark";

  private static readonly POSTMARK_API_KEY = env.POSTMARK_API_KEY;
  private static readonly POSTMARK_BASE_URL = "https://api.postmarkapp.com";

  private axiosInstance: AxiosInstance | null = null;

  private getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      this.axiosInstance = axios.create({
        baseURL: PostmarkProvider.POSTMARK_BASE_URL,
        headers: {
          "X-Postmark-Server-Token": PostmarkProvider.POSTMARK_API_KEY!,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    }
    return this.axiosInstance;
  }

  isConfigured(): boolean {
    return !!PostmarkProvider.POSTMARK_API_KEY;
  }

  async sendMail(options: MailOptions): Promise<MailResult> {
    if (!this.isConfigured()) {
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
      const response = await this.getAxiosInstance().post("/email", payload);

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
