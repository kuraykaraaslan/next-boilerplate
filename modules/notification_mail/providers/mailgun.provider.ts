import { env } from '@/modules/env';
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import Logger from "@/modules/logger";
import SettingService from "@/modules/setting/setting.service";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

interface MailgunCreds {
  apiKey: string;
  domain: string;
  region: string;
}

export default class MailgunProvider extends BaseMailProvider {
  readonly name = "Mailgun";

  private async resolveCreds(tenantId: string): Promise<MailgunCreds> {
    const [apiKey, domain, region] = await Promise.all([
      SettingService.getValue(tenantId, 'mailgunApiKey'),
      SettingService.getValue(tenantId, 'mailgunDomain'),
      SettingService.getValue(tenantId, 'mailgunRegion'),
    ]);
    return {
      apiKey: apiKey ?? env.MAILGUN_API_KEY ?? '',
      domain: domain ?? env.MAILGUN_DOMAIN ?? '',
      region: region ?? env.MAILGUN_REGION ?? 'us',
    };
  }

  private getBaseUrl(region: string): string {
    return region === "eu"
      ? "https://api.eu.mailgun.net/v3"
      : "https://api.mailgun.net/v3";
  }

  private buildClient(creds: MailgunCreds): AxiosInstance {
    return axios.create({
      baseURL: this.getBaseUrl(creds.region),
      auth: { username: "api", password: creds.apiKey },
    });
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.resolveCreds(tenantId);
    return !!(c.apiKey && c.domain);
  }

  async sendMail(tenantId: string, options: MailOptions): Promise<MailResult> {
    const creds = await this.resolveCreds(tenantId);
    if (!creds.apiKey || !creds.domain) {
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
      const response = await this.buildClient(creds).post(
        `/${creds.domain}/messages`,
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
