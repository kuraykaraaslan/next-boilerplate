import { env } from '@/libs/env';
import Logger from "@/libs/logger";
import ejs from "ejs";
import path from "path";
import { Queue, Worker, Job } from "bullmq";
import { getBullMQConnection } from "@/libs/redis/bullmq";

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
      const { to, subject, html, provider } = job.data;
      Logger.info(`MAIL Worker processing job ${job.id}...`);
      await MailService._sendMail({ to, subject, html, provider });
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
   * Get the provider instance by name
   */
  static getProvider(providerName?: MailProviderType): BaseMailProvider {
    const name = providerName || MailService.DEFAULT_PROVIDER;
    const provider = MailService.PROVIDER_MAP.get(name);

    if (!provider) {
      Logger.warn(`MailService: Unknown provider "${name}", falling back to SMTP`);
      return MailService.smtpProvider;
    }

    if (!provider.isConfigured()) {
      Logger.warn(`MailService: Provider "${name}" is not configured, trying fallback`);
      // Try to find a configured provider
      for (const [, p] of MailService.PROVIDER_MAP) {
        if (p.isConfigured()) {
          Logger.info(`MailService: Using fallback provider "${p.name}"`);
          return p;
        }
      }
    }

    return provider;
  }

  /**
   * List all available and configured providers
   */
  static listProviders(): { name: MailProviderType; configured: boolean }[] {
    const result: { name: MailProviderType; configured: boolean }[] = [];
    for (const [name, provider] of MailService.PROVIDER_MAP) {
      result.push({ name, configured: provider.isConfigured() });
    }
    return result;
  }

  /**
   * Base template variables for all emails
   */
  static getBaseTemplateVars() {
    return {
      appName: MailService.APPLICATION_NAME,
      frontendUrl: MailService.FRONTEND_URL,
      loginLink: MailService.FRONTEND_URL + MailService.FRONTEND_LOGIN_PATH,
      resetPasswordLink: MailService.FRONTEND_URL + MailService.FRONTEND_RESET_PASSWORD_PATH,
      forgotPasswordLink: MailService.FRONTEND_URL + MailService.FRONTEND_FORGOT_PASSWORD_PATH,
      termsLink: MailService.FRONTEND_URL + MailService.FRONTEND_TERMS_PATH,
      privacyLink: MailService.FRONTEND_URL + MailService.FRONTEND_PRIVACY_PATH,
      supportEmail: MailService.FRONTEND_SUPPORT_EMAIL,
      secureAccountLink: MailService.FRONTEND_URL + MailService.FRONTEND_RESET_PASSWORD_PATH,
    };
  }

  /**
   * Add email job to queue
   */
  static async sendMail(
    to: string,
    subject: string,
    html: string,
    provider?: MailProviderType
  ): Promise<void> {
    try {
      await MailService.QUEUE.add("sendMail", { to, subject, html, provider });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`MAIL sendMail ERROR: ${to} ${subject} ${message}`);
    }
  }

  /**
   * Send email directly without queue (for urgent emails)
   */
  static async sendMailDirect(
    to: string,
    subject: string,
    html: string,
    provider?: MailProviderType
  ): Promise<MailResult> {
    return MailService._sendMail({ to, subject, html, provider });
  }

  /**
   * Internal method to send email via provider
   */
  private static async _sendMail({
    to,
    subject,
    html,
    provider: providerName,
  }: MailJobData): Promise<MailResult> {
    const provider = MailService.getProvider(providerName);

    const options: MailOptions = {
      to,
      subject,
      html,
      from: MailService.MAIL_FROM,
    };

    return provider.sendMail(options);
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

  // ==================== EMAIL METHODS ====================

  /**
   * Welcome email for new users
   */
  static async sendWelcomeEmail({ email, name }: { email: string; name?: string }): Promise<void> {
    try {
      const subject = `Welcome to ${MailService.APPLICATION_NAME}`;
      const emailContent = await MailService.renderTemplate("welcome.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendWelcomeEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * New login detected email
   */
  static async sendNewLoginEmail({
    email,
    name,
    device,
    ipAddress,
    location,
    loginTime,
  }: {
    email: string;
    name?: string;
    device?: string;
    ipAddress?: string;
    location?: string;
    loginTime?: string;
  }): Promise<void> {
    try {
      const subject = "New Login Detected";
      const emailContent = await MailService.renderTemplate("new_login.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        device: device || "Unknown",
        ipAddress: ipAddress || "Unknown",
        location: location || "Unknown",
        loginTime: loginTime || new Date().toLocaleString(),
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendNewLoginEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Forgot password email with reset token
   */
  static async sendForgotPasswordEmail({
    email,
    name,
    resetToken,
  }: {
    email: string;
    name?: string;
    resetToken: string;
  }): Promise<void> {
    try {
      const subject = "Reset Your Password";
      const resetLink =
        MailService.FRONTEND_URL +
        MailService.FRONTEND_FORGOT_PASSWORD_PATH +
        "?resetToken=" +
        resetToken +
        "&email=" +
        email;
      const emailContent = await MailService.renderTemplate("forgot_password.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        resetToken,
        resetLink,
        expiryTime: 1,
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendForgotPasswordEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Password reset success email
   */
  static async sendPasswordResetSuccessEmail({
    email,
    name,
  }: {
    email: string;
    name?: string;
  }): Promise<void> {
    try {
      const subject = "Password Reset Successful";
      const emailContent = await MailService.renderTemplate("password_reset.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendPasswordResetSuccessEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * OTP verification email
   */
  static async sendOTPEmail({
    email,
    name,
    otpToken,
  }: {
    email: string;
    name?: string | null;
    otpToken: string;
  }): Promise<void> {
    try {
      if (!otpToken) throw new Error("OTP token is required");
      const subject = "Your OTP Code";
      const emailContent = await MailService.renderTemplate("otp.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        otpToken,
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendOTPEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * OTP enabled notification
   */
  static async sendOTPEnabledEmail({ email, name }: { email: string; name?: string }): Promise<void> {
    try {
      const subject = "OTP Enabled";
      const emailContent = await MailService.renderTemplate("otp_enabled.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendOTPEnabledEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * OTP disabled notification
   */
  static async sendOTPDisabledEmail({ email, name }: { email: string; name?: string }): Promise<void> {
    try {
      const subject = "OTP Disabled";
      const emailContent = await MailService.renderTemplate("otp_disabled.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendOTPDisabledEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Email changed notification
   */
  static async sendEmailChangedEmail({ email, name }: { email: string; name?: string }): Promise<void> {
    try {
      const subject = "Your Email Was Updated";
      const emailContent = await MailService.renderTemplate("email_change.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendEmailChangedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Email verification
   */
  static async sendVerifyEmail({
    email,
    name,
    verifyToken,
  }: {
    email: string;
    name?: string;
    verifyToken: string;
  }): Promise<void> {
    try {
      const subject = "Verify Your Email";
      const verifyLink =
        MailService.FRONTEND_URL + "/auth/verify-email?token=" + verifyToken + "&email=" + email;
      const emailContent = await MailService.renderTemplate("verify_email.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        verifyLink,
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendVerifyEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Password changed notification
   */
  static async sendPasswordChangedEmail({ email, name }: { email: string; name?: string }): Promise<void> {
    try {
      const subject = "Your Password Was Changed";
      const emailContent = await MailService.renderTemplate("password_changed.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendPasswordChangedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Suspicious activity alert
   */
  static async sendSuspiciousActivityEmail({
    email,
    name,
    eventType,
    ip,
    location,
    attemptTime,
  }: {
    email: string;
    name?: string;
    eventType: string;
    ip: string;
    location: string;
    attemptTime: string;
  }): Promise<void> {
    try {
      const subject = "Suspicious Activity Detected";
      const emailContent = await MailService.renderTemplate("suspicious_activity.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        eventType,
        ip,
        location,
        attemptTime,
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendSuspiciousActivityEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * New device login alert
   */
  static async sendNewDeviceAlertEmail({
    email,
    name,
    device,
    ip,
    location,
    loginTime,
  }: {
    email: string;
    name?: string;
    device: string;
    ip: string;
    location: string;
    loginTime: string;
  }): Promise<void> {
    try {
      const subject = "New Device Login Detected";
      const emailContent = await MailService.renderTemplate("new_device_alert.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        device,
        ip,
        location,
        loginTime,
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendNewDeviceAlertEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Tenant invitation email
   */
  static async sendTenantInvitationEmail({
    email,
    tenantName,
    memberRole,
    rawToken,
    tenantId,
  }: {
    email: string;
    tenantName: string;
    memberRole: string;
    rawToken: string;
    tenantId: string;
  }): Promise<void> {
    try {
      const subject = `You've been invited to join ${tenantName}`;
      const INVITATION_TTL_SECONDS = env.INVITATION_TTL_SECONDS ?? (60 * 60 * 24 * 7);
      const expiryDays = Math.round(INVITATION_TTL_SECONDS / (60 * 60 * 24));
      const invitationLink =
        `${MailService.FRONTEND_URL}/tenant/${tenantId}/auth/invitation/accept?token=${rawToken}`;
      const declineLink =
        `${MailService.FRONTEND_URL}/tenant/${tenantId}/auth/invitation/decline?token=${rawToken}`;
      const emailContent = await MailService.renderTemplate("tenant_invitation.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        tenantName,
        memberRole,
        expiryDays,
        invitationLink,
        declineLink,
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendTenantInvitationEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Contact form submission - Admin notification
   */
  static async sendContactFormAdminEmail({
    message,
    name,
    email,
    phone,
  }: {
    message: string;
    name: string;
    email: string;
    phone: string;
  }): Promise<void> {
    if (!MailService.INFORM_MAIL) return;
    try {
      const subject = "New Contact Form Message";
      const emailContent = await MailService.renderTemplate("contact_form_admin.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        message,
        name,
        email,
        phone,
      });
      await MailService.sendMail(MailService.INFORM_MAIL, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendContactFormAdminEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Contact form submission - User confirmation
   */
  static async sendContactFormUserEmail({ name, email }: { name: string; email: string }): Promise<void> {
    try {
      const subject = "We Received Your Message";
      const emailContent = await MailService.renderTemplate("contact_form_user.ejs", {
        ...MailService.getBaseTemplateVars(),
        subject,
        user: { name },
      });
      await MailService.sendMail(email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailService.sendContactFormUserEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }
}
