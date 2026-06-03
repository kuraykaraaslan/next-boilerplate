import Logger from "@/modules/logger";
import MailService from "./notification_mail.service";
import { getBaseTemplateVars } from "./notification_mail.template-vars";

/**
 * Email templates for invoices and authentication/OTP flows. Each renders an EJS
 * template and dispatches it via {@link MailService}. Account/security and
 * tenant/contact templates live in `MailAccountTemplatesService`.
 */
export default class MailTemplatesService {

  static async sendInvoiceIssuedEmail({
    tenantId, email, invoice,
  }: {
    tenantId: string;
    email: string;
    invoice: Record<string, unknown>;
  }): Promise<void> {
    try {
      const subject = `Invoice ${invoice.invoiceNumber} — ${invoice.totalAmount} ${invoice.currency}`;
      const html = await MailService.renderTemplate('invoice_issued.ejs', {
        ...getBaseTemplateVars(),
        subject,
        invoice,
      });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendInvoiceIssuedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Receipt — sent on payment success. */
  static async sendInvoicePaidEmail({
    tenantId, email, invoice,
  }: {
    tenantId: string;
    email: string;
    invoice: Record<string, unknown>;
  }): Promise<void> {
    try {
      const subject = `Receipt for ${invoice.invoiceNumber} — paid`;
      const html = await MailService.renderTemplate('invoice_paid.ejs', {
        ...getBaseTemplateVars(),
        subject,
        invoice,
      });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendInvoicePaidEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Dunning email — sent on Stripe `invoice.payment_failed`. */
  static async sendInvoicePaymentFailedEmail({
    tenantId, email, invoice, reason, retryAt, billingPortalUrl,
  }: {
    tenantId: string;
    email: string;
    invoice: Record<string, unknown>;
    reason?: string;
    retryAt?: Date | string;
    billingPortalUrl?: string;
  }): Promise<void> {
    try {
      const subject = `Payment failed — invoice ${invoice.invoiceNumber}`;
      const html = await MailService.renderTemplate('invoice_payment_failed.ejs', {
        ...getBaseTemplateVars(),
        subject,
        invoice,
        reason,
        retryAt,
        billingPortalUrl: billingPortalUrl ?? '',
      });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendInvoicePaymentFailedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Welcome email for new users
   */
  static async sendWelcomeEmail({ tenantId,
    email, name }: { tenantId: string;
    email: string; name?: string }): Promise<void> {
    try {
      const subject = `Welcome to ${MailService.APPLICATION_NAME}`;
      const emailContent = await MailService.renderTemplate("welcome.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendWelcomeEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * New login detected email
   */
  static async sendNewLoginEmail({
    tenantId,
    email,
    name,
    device,
    ipAddress,
    location,
    loginTime,
  }: {
    tenantId: string;
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
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        device: device || "Unknown",
        ipAddress: ipAddress || "Unknown",
        location: location || "Unknown",
        loginTime: loginTime || new Date().toLocaleString(),
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendNewLoginEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Forgot password email with reset token
   */
  static async sendForgotPasswordEmail({
    tenantId,
    email,
    name,
    resetToken,
  }: {
    tenantId: string;
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
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        resetToken,
        resetLink,
        expiryTime: 1,
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendForgotPasswordEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Password reset success email
   */
  static async sendPasswordResetSuccessEmail({
    tenantId,
    email,
    name,
  }: {
    tenantId: string;
    email: string;
    name?: string;
  }): Promise<void> {
    try {
      const subject = "Password Reset Successful";
      const emailContent = await MailService.renderTemplate("password_reset.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendPasswordResetSuccessEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * OTP verification email
   */
  static async sendOTPEmail({
    tenantId,
    email,
    name,
    otpToken,
  }: {
    tenantId: string;
    email: string;
    name?: string | null;
    otpToken: string;
  }): Promise<void> {
    try {
      if (!otpToken) throw new Error("OTP token is required");
      const subject = "Your OTP Code";
      const emailContent = await MailService.renderTemplate("otp.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        otpToken,
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendOTPEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * OTP enabled notification
   */
  static async sendOTPEnabledEmail({ tenantId,
    email, name }: { tenantId: string;
    email: string; name?: string }): Promise<void> {
    try {
      const subject = "OTP Enabled";
      const emailContent = await MailService.renderTemplate("otp_enabled.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendOTPEnabledEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * OTP disabled notification
   */
  static async sendOTPDisabledEmail({ tenantId,
    email, name }: { tenantId: string;
    email: string; name?: string }): Promise<void> {
    try {
      const subject = "OTP Disabled";
      const emailContent = await MailService.renderTemplate("otp_disabled.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesService.sendOTPDisabledEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Email changed notification
   */
}
