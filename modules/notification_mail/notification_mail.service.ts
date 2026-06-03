import { env } from '@/modules/env';
import Logger from "@/modules/logger";
import ejs from "ejs";
import path from "path";
import { Queue, Worker, Job } from "bullmq";
import { getBullMQConnection } from "@/modules/redis/redis.bullmq";
import { TenantUsageService } from "@/modules/tenant_usage/tenant_usage.service";
import NotificationLogService from "@/modules/notification_log/notification_log.service";
import TenantFeatureGateService from "@/modules/tenant_subscription/tenant_subscription.feature.service";
import { FEATURE_KEYS } from "@/modules/tenant_subscription/tenant_subscription.feature-keys";
import { isRootTenant } from "@/modules/tenant/tenant.constants";

// Providers
import BaseMailProvider, { MailOptions, MailResult } from "./providers/base.provider";
import SMTPProvider from "./providers/smtp.provider";
import SendGridProvider from "./providers/sendgrid.provider";
import MailgunProvider from "./providers/mailgun.provider";
import SESProvider from "./providers/ses.provider";
import PostmarkProvider from "./providers/postmark.provider";
import ResendProvider from "./providers/resend.provider";

export type MailProviderType = "smtp" | "sendgrid" | "mailgun" | "ses" | "postmark" | "resend";

interface MailJobData {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  provider?: MailProviderType;
}

export default class MailService {
  private static _initialized = false;

  // Provider instances
  private static readonly smtpProvider = new SMTPProvider();
  private static readonly sendgridProvider = new SendGridProvider();
  private static readonly mailgunProvider = new MailgunProvider();
  private static readonly sesProvider = new SESProvider();
  private static readonly postmarkProvider = new PostmarkProvider();
  private static readonly resendProvider = new ResendProvider();

  // Provider map
  private static readonly PROVIDER_MAP = new Map<MailProviderType, BaseMailProvider>([
    ["smtp", MailService.smtpProvider],
    ["sendgrid", MailService.sendgridProvider],
    ["mailgun", MailService.mailgunProvider],
    ["ses", MailService.sesProvider],
    ["postmark", MailService.postmarkProvider],
    ["resend", MailService.resendProvider],
  ]);

  // Default provider from env or fallback to smtp
  private static readonly DEFAULT_PROVIDER: MailProviderType =
    (env.MAIL_PROVIDER as MailProviderType) || "smtp";

  // Queue + Worker
  static readonly QUEUE_NAME = "mailQueue";

  static readonly QUEUE = new Queue<MailJobData>(MailService.QUEUE_NAME, {
    connection: getBullMQConnection(),
  });

  static readonly WORKER = new Worker<MailJobData>(
    MailService.QUEUE_NAME,
    async (job: Job<MailJobData>) => {
      const { tenantId, to, subject, html, provider } = job.data;
      Logger.info(`MAIL Worker processing job ${job.id}...`);
      await MailService._sendMail({ tenantId, to, subject, html, provider });
    },
    { connection: getBullMQConnection(), concurrency: 5 }
  );

  static {
    if (!MailService._initialized) {
      MailService.WORKER.on("completed", (job: Job<MailJobData>) => {
        Logger.info(`MAIL Worker completed job ${job.id}`);
      });

      MailService.WORKER.on("failed", (job: Job<MailJobData> | undefined, err: Error) => {
        Logger.error(`MAIL Worker failed job ${job?.id ?? "unknown"}: ${err.message}`);
      });

      MailService._initialized = true;
    }
  }

  // Template paths - relative to this module
  static readonly TEMPLATE_PATH = path.join(__dirname, "templates");

  // Application config
  static readonly APPLICATION_NAME = env.APPLICATION_NAME || "Next Boilerplate";
  static readonly APPLICATION_HOST = env.APPLICATION_HOST || "http://localhost:3000";
  static readonly MAIL_FROM = env.MAIL_FROM || `${MailService.APPLICATION_NAME} <noreply@example.com>`;

  // Frontend URLs
  static readonly FRONTEND_URL = MailService.APPLICATION_HOST;
  static readonly FRONTEND_LOGIN_PATH = env.FRONTEND_LOGIN_PATH || "/auth/login";
  static readonly FRONTEND_REGISTER_PATH = env.FRONTEND_REGISTER_PATH || "/auth/register";
  static readonly FRONTEND_PRIVACY_PATH = env.FRONTEND_PRIVACY_PATH || "/privacy";
  static readonly FRONTEND_TERMS_PATH = env.FRONTEND_TERMS_PATH || "/terms-of-use";
  static readonly FRONTEND_RESET_PASSWORD_PATH = env.FRONTEND_RESET_PASSWORD_PATH || "/auth/reset-password";
  static readonly FRONTEND_FORGOT_PASSWORD_PATH = env.FRONTEND_FORGOT_PASSWORD_PATH || "/auth/forgot-password";
  static readonly FRONTEND_SUPPORT_EMAIL = env.FRONTEND_SUPPORT_EMAIL || "support@example.com";

  // Admin notify
  static readonly INFORM_MAIL = env.INFORM_MAIL;
  static readonly INFORM_NAME = env.INFORM_NAME;

  /**
   * Get the provider instance for a tenant by name, falling back through the
   * tenant's configured providers when the requested one is missing creds.
   */
  static async getProvider(tenantId: string, providerName?: MailProviderType): Promise<BaseMailProvider> {
    const name = providerName || MailService.DEFAULT_PROVIDER;
    const provider = MailService.PROVIDER_MAP.get(name);

    if (!provider) {
      Logger.warn(`MailService: Unknown provider "${name}", falling back to SMTP`);
      return MailService.smtpProvider;
    }

    if (!(await provider.isConfigured(tenantId))) {
      Logger.warn(`MailService: Provider "${name}" is not configured for tenant ${tenantId}, trying fallback`);
      for (const [, p] of MailService.PROVIDER_MAP) {
        if (await p.isConfigured(tenantId)) {
          Logger.info(`MailService: Using fallback provider "${p.name}"`);
          return p;
        }
      }
    }

    return provider;
  }

  /**
   * List all available and configured providers for a tenant.
   */
  static async listProviders(tenantId: string): Promise<{ name: MailProviderType; configured: boolean }[]> {
    const result: { name: MailProviderType; configured: boolean }[] = [];
    for (const [name, provider] of MailService.PROVIDER_MAP) {
      result.push({ name, configured: await provider.isConfigured(tenantId) });
    }
    return result;
  }


  /**
   * Defense-in-depth billing gate for outbound email. Asserts the tenant's
   * active plan grants `feature_email_send` (BOOLEAN) and is below the
   * `feature_email_monthly_quota` LIMIT for the current month
   * (TenantUsage.emailSends).
   *
   * Root tenant is short-circuited — the platform owner does not purchase
   * its own plan. Best-effort: the LIMIT check is not atomic so a small
   * over-run is possible under concurrent calls.
   */
  static async assertMailFeatureAccess(tenantId: string): Promise<void> {
    if (isRootTenant(tenantId)) return;

    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_EMAIL_SEND);

    const usage = await TenantUsageService.getUsage(tenantId);
    await TenantFeatureGateService.assertFeatureAccess(
      tenantId,
      FEATURE_KEYS.FEATURE_EMAIL_MONTHLY_QUOTA,
      usage.emailSends,
    );
  }

  /**
   * Add email job to queue (tenant-scoped — the worker reads each tenant's
   * provider config when the job runs).
   */
  static async sendMail(
    tenantId: string,
    to: string,
    subject: string,
    html: string,
    provider?: MailProviderType
  ): Promise<void> {
    try {
      await MailService.assertMailFeatureAccess(tenantId);
      await MailService.QUEUE.add("sendMail", { tenantId, to, subject, html, provider });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`MAIL sendMail ERROR: ${to} ${subject} ${message}`);
    }
  }

  /**
   * Send email directly without queue (for urgent emails)
   */
  static async sendMailDirect(
    tenantId: string,
    to: string,
    subject: string,
    html: string,
    provider?: MailProviderType
  ): Promise<MailResult> {
    await MailService.assertMailFeatureAccess(tenantId);
    return MailService._sendMail({ tenantId, to, subject, html, provider });
  }

  /**
   * Internal method to send email via provider.
   *
   * Side-effects on success:
   *   - increments `TenantUsage.emailSends` (Redis counter, flushed to DB).
   *   - inserts a `NotificationLog` row with status='sent' + providerMessageId.
   * On failure:
   *   - inserts a `NotificationLog` row with status='failed' + error message.
   * Tracking failures are swallowed so they never break mail delivery.
   */
  private static async _sendMail({
    tenantId,
    to,
    subject,
    html,
    provider: providerName,
  }: MailJobData): Promise<MailResult> {
    // Re-assert feature access at the worker boundary so a long-queued job
    // does not bypass gating after a plan was downgraded / cancelled.
    await MailService.assertMailFeatureAccess(tenantId);

    const provider = await MailService.getProvider(tenantId, providerName);

    const options: MailOptions = {
      to,
      subject,
      html,
      from: MailService.MAIL_FROM,
    };

    let result: MailResult;
    try {
      result = await provider.sendMail(tenantId, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await NotificationLogService.log(tenantId, 'mail', to, 'failed', {
        subject,
        provider: provider.name,
        error: message,
      });
      throw err;
    }

    if (result.success) {
      await TenantUsageService.incrementEmailSends(tenantId, 1);
      await NotificationLogService.log(tenantId, 'mail', to, 'sent', {
        subject,
        provider: provider.name,
        providerMessageId: result.messageId,
      });
    } else {
      await NotificationLogService.log(tenantId, 'mail', to, 'failed', {
        subject,
        provider: provider.name,
        error: result.error,
      });
    }

    return result;
  }

  /**
   * Renders an EJS template with layout
   */
  static async renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
    const templatePath = path.join(MailService.TEMPLATE_PATH, templateName);

    // Render the main email content
    const body = await ejs.renderFile(templatePath, data, { async: true });

    // Render header and footer partials
    const headerPath = path.join(MailService.TEMPLATE_PATH, "partials", "email_header.ejs");
    const footerPath = path.join(MailService.TEMPLATE_PATH, "partials", "email_footer.ejs");

    const headerHtml = await ejs.renderFile(headerPath, data, { async: true });
    const footerHtml = await ejs.renderFile(footerPath, data, { async: true });

    // Render the layout with body, header, and footer
    const layoutPath = path.join(MailService.TEMPLATE_PATH, "layouts", "email_layout.ejs");

    return await ejs.renderFile(
      layoutPath,
      { ...data, body, headerHtml, footerHtml },
      { async: true }
    );
  }
}
