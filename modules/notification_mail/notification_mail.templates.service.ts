import MailTemplatesInvoiceService from './notification_mail.templates.invoice.service';
import MailTemplatesAuthService from './notification_mail.templates.auth.service';

export { MailTemplatesInvoiceService, MailTemplatesAuthService };

export default class MailTemplatesService {

  // Invoice templates
  static sendInvoiceIssuedEmail        = MailTemplatesInvoiceService.sendInvoiceIssuedEmail.bind(MailTemplatesInvoiceService);
  static sendInvoicePaidEmail          = MailTemplatesInvoiceService.sendInvoicePaidEmail.bind(MailTemplatesInvoiceService);
  static sendInvoicePaymentFailedEmail = MailTemplatesInvoiceService.sendInvoicePaymentFailedEmail.bind(MailTemplatesInvoiceService);

  // Auth / OTP templates
  static sendWelcomeEmail              = MailTemplatesAuthService.sendWelcomeEmail.bind(MailTemplatesAuthService);
  static sendNewLoginEmail             = MailTemplatesAuthService.sendNewLoginEmail.bind(MailTemplatesAuthService);
  static sendForgotPasswordEmail       = MailTemplatesAuthService.sendForgotPasswordEmail.bind(MailTemplatesAuthService);
  static sendPasswordResetSuccessEmail = MailTemplatesAuthService.sendPasswordResetSuccessEmail.bind(MailTemplatesAuthService);
  static sendOTPEmail                  = MailTemplatesAuthService.sendOTPEmail.bind(MailTemplatesAuthService);
  static sendOTPEnabledEmail           = MailTemplatesAuthService.sendOTPEnabledEmail.bind(MailTemplatesAuthService);
  static sendOTPDisabledEmail          = MailTemplatesAuthService.sendOTPDisabledEmail.bind(MailTemplatesAuthService);
}
