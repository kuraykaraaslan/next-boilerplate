import { env } from '@/modules/env';
import nodemailer, { Transporter } from "nodemailer";
import Logger from "@/modules/logger";
import SettingService from "@/modules/setting/setting.service";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

interface SmtpCreds {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

export default class SMTPProvider extends BaseMailProvider {
  readonly name = "SMTP";

  // Cache one transporter per tenant — credentials change rarely and a new
  // nodemailer transport per send would be wasteful.
  private transporters = new Map<string, Transporter>();

  /**
   * Resolve SMTP credentials for `tenantId` from SettingService with env
   * fallback. The keys map 1:1 to notification_mail.setting.keys.ts.
   */
  private async resolveCreds(tenantId: string): Promise<SmtpCreds> {
    const [host, port, user, pass, secure] = await Promise.all([
      SettingService.getValue(tenantId, 'smtpHost'),
      SettingService.getValue(tenantId, 'smtpPort'),
      SettingService.getValue(tenantId, 'smtpUsername'),
      SettingService.getValue(tenantId, 'smtpPassword'),
      SettingService.getValue(tenantId, 'smtpSecure'),
    ]);
    const portNum = Number(port ?? env.SMTP_PORT ?? 587);
    return {
      host: host ?? env.SMTP_HOST ?? '',
      port: portNum || 587,
      user: user ?? env.SMTP_USER ?? '',
      pass: pass ?? env.SMTP_PASS ?? '',
      secure: (secure ? secure === 'true' : env.SMTP_SECURE) || portNum === 465,
    };
  }

  private async getTransporter(tenantId: string): Promise<Transporter> {
    const cached = this.transporters.get(tenantId);
    if (cached) return cached;
    const creds = await this.resolveCreds(tenantId);
    const t = nodemailer.createTransport({
      host: creds.host,
      port: creds.port,
      secure: creds.secure,
      auth: { user: creds.user, pass: creds.pass },
    });
    this.transporters.set(tenantId, t);
    return t;
  }

  async isConfigured(tenantId: string): Promise<boolean> {
    const creds = await this.resolveCreds(tenantId);
    return !!(creds.host && creds.user && creds.pass);
  }

  async sendMail(tenantId: string, options: MailOptions): Promise<MailResult> {
    if (!(await this.isConfigured(tenantId))) {
      Logger.error("SMTP: Provider is not configured");
      return { success: false, error: "SMTP provider is not configured" };
    }

    try {
      const result = await (await this.getTransporter(tenantId)).sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        cc: options.cc?.join(", "),
        bcc: options.bcc?.join(", "),
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      Logger.info(`SMTP: Email sent successfully to ${options.to}`);
      return { success: true, messageId: result.messageId };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`SMTP: Failed to send email to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
