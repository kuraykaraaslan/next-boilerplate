import { env } from '@/libs/env';
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import Logger from "@/libs/logger";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class MailgunProvider extends BaseMailProvider {
  readonly name = "Mailgun";

  private static readonly MAILGUN_API_KEY = env.MAILGUN_API_KEY;
  private static readonly MAILGUN_DOMAIN = env.MAILGUN_DOMAIN;
  private static readonly MAILGUN_REGION = env.MAILGUN_REGION || "us"; // "us" or "eu"

  private getBaseUrl(): string {
    return MailgunProvider.MAILGUN_REGION === "eu"
      ? "https://api.eu.mailgun.net/v3"
      : "https://api.mailgun.net/v3";
  }

  private axiosInstance: AxiosInstance | null = null;

  private getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      this.axiosInstance = axios.create({
        baseURL: this.getBaseUrl(),
        auth: {
          username: "api",
          password: MailgunProvider.MAILGUN_API_KEY!,
        },
      });
    }
    return this.axiosInstance;
  }

  isConfigured(): boolean {
    return !!(MailgunProvider.MAILGUN_API_KEY && MailgunProvider.MAILGUN_DOMAIN);
  }

  async sendMail(options: MailOptions): Promise<MailResult> {
    if (!this.isConfigured()) {
      Logger.error("Mailgun: Provider is not configured");
      return { success: false, error: "Mailgun provider is not configured" };
    }

    const formData = new FormData();
    formData.append("from", options.from!);
    formData.append("to", options.to);
    formData.append("subject", options.subject);
    formData.append("html", options.html);

    if (options.replyTo) {
      formData.append("h:Reply-To", options.replyTo);
    }

    if (options.cc?.length) {
      formData.append("cc", options.cc.join(","));
    }

    if (options.bcc?.length) {
      formData.append("bcc", options.bcc.join(","));
    }

    if (options.attachments?.length) {
      for (const att of options.attachments) {
        formData.append("attachment", att.content, {
          filename: att.filename,
          contentType: att.contentType,
        });
      }
    }

    try {
      const response = await this.getAxiosInstance().post(
        `/${MailgunProvider.MAILGUN_DOMAIN}/messages`,
        formData,
        { headers: formData.getHeaders() }
      );

      if (response.status === 200) {
        Logger.info(`Mailgun: Email sent successfully to ${options.to}`);
        return { success: true, messageId: response.data.id };
      }

      return { success: false, error: `Unexpected status: ${response.status}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Mailgun: Failed to send email to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
