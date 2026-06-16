import { env } from "@nb/env";
import Logger from "@nb/logger";
import MailService from "./notification_mail.service";
import { getBaseTemplateVars } from "./notification_mail.template-vars";

/**
 * Email templates for account/security events (email/password changes, security
 * alerts) plus tenant invitations and contact-form mails. Auth/OTP and invoice
 * templates live in `MailTemplatesService`.
 */
export default class MailAccountTemplatesService {

  static async sendEmailChangedEmail({ tenantId,
    email, name }: { tenantId: string;
    email: string; name?: string }): Promise<void> {
    try {
      const subject = "Your Email Was Updated";
      const emailContent = await MailService.renderTemplate("email_change.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendEmailChangedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Email verification
   */
  static async sendVerifyEmail({
    tenantId,
    email,
    name,
    verifyToken,
    subject: subjectOverride,
  }: {
    tenantId: string;
    email: string;
    name?: string;
    verifyToken: string;
    subject?: string;
  }): Promise<void> {
    try {
      const subject = subjectOverride || "Verify Your Email";
      const verifyLink =
        MailService.FRONTEND_URL + "/auth/verify-email?token=" + verifyToken + "&email=" + email;
      const emailContent = await MailService.renderTemplate("verify_email.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        verifyLink,
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendVerifyEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Password changed notification
   */
  static async sendPasswordChangedEmail({ tenantId,
    email, name }: { tenantId: string;
    email: string; name?: string }): Promise<void> {
    try {
      const subject = "Your Password Was Changed";
      const emailContent = await MailService.renderTemplate("password_changed.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendPasswordChangedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Suspicious activity alert
   */
  static async sendSuspiciousActivityEmail({
    tenantId,
    email,
    name,
    eventType,
    ip,
    location,
    attemptTime,
  }: {
    tenantId: string;
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
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        eventType,
        ip,
        location,
        attemptTime,
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendSuspiciousActivityEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * New device login alert
   */
  static async sendNewDeviceAlertEmail({
    tenantId,
    email,
    name,
    device,
    ip,
    location,
    loginTime,
  }: {
    tenantId: string;
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
        ...getBaseTemplateVars(),
        subject,
        user: { name: name || email },
        device,
        ip,
        location,
        loginTime,
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendNewDeviceAlertEmail error: ${error instanceof Error ? error.message : error}`);
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
        ...getBaseTemplateVars(),
        subject,
        tenantName,
        memberRole,
        expiryDays,
        invitationLink,
        declineLink,
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendTenantInvitationEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Contact form submission - Admin notification
   */
  static async sendContactFormAdminEmail({
    tenantId,
    message,
    name,
    email,
    phone,
  }: {
    tenantId: string;
    message: string;
    name: string;
    email: string;
    phone: string;
  }): Promise<void> {
    if (!MailService.INFORM_MAIL) return;
    try {
      const subject = "New Contact Form Message";
      const emailContent = await MailService.renderTemplate("contact_form_admin.ejs", {
        ...getBaseTemplateVars(),
        subject,
        message,
        name,
        email,
        phone,
      });
      await MailService.sendMail(tenantId, MailService.INFORM_MAIL, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendContactFormAdminEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Contact form submission - User confirmation
   */
  static async sendContactFormUserEmail({ tenantId,
    name, email }: { tenantId: string;
    name: string; email: string }): Promise<void> {
    try {
      const subject = "We Received Your Message";
      const emailContent = await MailService.renderTemplate("contact_form_user.ejs", {
        ...getBaseTemplateVars(),
        subject,
        user: { name },
      });
      await MailService.sendMail(tenantId, email, subject, emailContent);
    } catch (error: unknown) {
      Logger.error(`MailAccountTemplatesService.sendContactFormUserEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }
}
