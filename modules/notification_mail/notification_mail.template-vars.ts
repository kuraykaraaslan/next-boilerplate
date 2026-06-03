import MailService from "./notification_mail.service";

/**
 * Base template variables shared by every email template (app name, frontend
 * links, support email). Pulled from the {@link MailService} env-derived
 * constants so the two template services stay in sync.
 */
export function getBaseTemplateVars() {
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
