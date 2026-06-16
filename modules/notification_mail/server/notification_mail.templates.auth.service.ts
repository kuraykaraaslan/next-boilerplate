import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import MailService from './notification_mail.service';
import { getBaseTemplateVars } from './notification_mail.template-vars';
import NotificationMailMessages from './notification_mail.messages';

export default class MailTemplatesAuthService {

  static async sendWelcomeEmail({ tenantId, email, name }: { tenantId: string; email: string; name?: string }): Promise<void> {
    try {
      const subject = `Welcome to ${MailService.APPLICATION_NAME}`;
      const html = await MailService.renderTemplate('welcome.ejs', { ...getBaseTemplateVars(), subject, user: { name: name || email } });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesAuthService.sendWelcomeEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendNewLoginEmail({
    tenantId, email, name, device, ipAddress, location, loginTime,
  }: {
    tenantId: string; email: string; name?: string; device?: string;
    ipAddress?: string; location?: string; loginTime?: string;
  }): Promise<void> {
    try {
      const subject = 'New Login Detected';
      const html = await MailService.renderTemplate('new_login.ejs', {
        ...getBaseTemplateVars(), subject, user: { name: name || email },
        device: device || 'Unknown', ipAddress: ipAddress || 'Unknown',
        location: location || 'Unknown', loginTime: loginTime || new Date().toLocaleString(),
      });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesAuthService.sendNewLoginEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendForgotPasswordEmail({
    tenantId, email, name, resetToken, subject: subjectOverride,
  }: { tenantId: string; email: string; name?: string; resetToken: string; subject?: string }): Promise<void> {
    try {
      const subject = subjectOverride || 'Reset Your Password';
      const resetLink = MailService.FRONTEND_URL + MailService.FRONTEND_FORGOT_PASSWORD_PATH + '?resetToken=' + resetToken + '&email=' + email;
      const html = await MailService.renderTemplate('forgot_password.ejs', {
        ...getBaseTemplateVars(), subject, user: { name: name || email }, resetToken, resetLink, expiryTime: 1,
      });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesAuthService.sendForgotPasswordEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendPasswordResetSuccessEmail({ tenantId, email, name }: { tenantId: string; email: string; name?: string }): Promise<void> {
    try {
      const subject = 'Password Reset Successful';
      const html = await MailService.renderTemplate('password_reset.ejs', { ...getBaseTemplateVars(), subject, user: { name: name || email } });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesAuthService.sendPasswordResetSuccessEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendOTPEmail({
    tenantId, email, name, otpToken, subject: subjectOverride,
  }: { tenantId: string; email: string; name?: string | null; otpToken: string; subject?: string }): Promise<void> {
    try {
      if (!otpToken) throw new AppError(NotificationMailMessages.OTP_TOKEN_REQUIRED, 400, ErrorCode.VALIDATION_ERROR);
      const subject = subjectOverride || 'Your OTP Code';
      const html = await MailService.renderTemplate('otp.ejs', { ...getBaseTemplateVars(), subject, user: { name: name || email }, otpToken });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesAuthService.sendOTPEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendOTPEnabledEmail({ tenantId, email, name }: { tenantId: string; email: string; name?: string }): Promise<void> {
    try {
      const subject = 'OTP Enabled';
      const html = await MailService.renderTemplate('otp_enabled.ejs', { ...getBaseTemplateVars(), subject, user: { name: name || email } });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesAuthService.sendOTPEnabledEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendOTPDisabledEmail({ tenantId, email, name }: { tenantId: string; email: string; name?: string }): Promise<void> {
    try {
      const subject = 'OTP Disabled';
      const html = await MailService.renderTemplate('otp_disabled.ejs', { ...getBaseTemplateVars(), subject, user: { name: name || email } });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesAuthService.sendOTPDisabledEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }
}
