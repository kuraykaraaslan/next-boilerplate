import { env } from '@/modules/env';
import axios, { AxiosInstance } from "axios";
import Logger from "@/modules/logger";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class ResendProvider extends BaseMailProvider {
  readonly name = "Resend";

  private static readonly RESEND_API_KEY = env.RESEND_API_KEY;
  private static readonly RESEND_BASE_URL = "https://api.resend.com";

  private axiosInstance: AxiosInstance | null = null;

  private getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      this.axiosInstance = axios.create({
        baseURL: ResendProvider.RESEND_BASE_URL,
        headers: {
          Authorization: `Bearer ${ResendProvider.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
    }
    return this.axiosInstance;
  }

  isConfigured(): boolean {
    return !!ResendProvider.RESEND_API_KEY;
  }

  async sendMail(options: MailOptions): Promise<MailResult> {
    if (!this.isConfigured()) {
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
      const response = await this.getAxiosInstance().post("/emails", payload);

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
