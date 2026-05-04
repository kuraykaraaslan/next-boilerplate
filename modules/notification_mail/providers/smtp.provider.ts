import { env } from '@/libs/env';
import nodemailer, { Transporter } from "nodemailer";
import Logger from "@/libs/logger";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class SMTPProvider extends BaseMailProvider {
  readonly name = "SMTP";

  private static readonly SMTP_HOST = env.SMTP_HOST || env.MAIL_HOST;
  private static readonly SMTP_PORT = env.SMTP_PORT || env.MAIL_PORT || "587";
  private static readonly SMTP_USER = env.SMTP_USER || env.MAIL_USER;
  private static readonly SMTP_PASS = env.SMTP_PASS || env.MAIL_PASS;
  private static readonly SMTP_SECURE = env.SMTP_SECURE ?? false;

  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: SMTPProvider.SMTP_HOST,
        port: Number(SMTPProvider.SMTP_PORT),
        secure: SMTPProvider.SMTP_SECURE || Number(SMTPProvider.SMTP_PORT) === 465,
        auth: {
          user: SMTPProvider.SMTP_USER,
          pass: SMTPProvider.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  isConfigured(): boolean {
    return !!(
      SMTPProvider.SMTP_HOST &&
      SMTPProvider.SMTP_USER &&
      SMTPProvider.SMTP_PASS
    );
  }

  async sendMail(options: MailOptions): Promise<MailResult> {
    if (!this.isConfigured()) {
      Logger.error("SMTP: Provider is not configured");
      return { success: false, error: "SMTP provider is not configured" };
    }

    try {
      const result = await this.getTransporter().sendMail({
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
