import { z } from 'zod';
import { boolEnv } from './env.schema.shared';

// Provider credentials: mail, SMS, storage, SSO, national identity (ACS), AI,
// payment.
export const providerFields = {
  // ── Mail ─────────────────────────────────────────────────────────────────────
  MAIL_PROVIDER: z.string().default('smtp'),
  MAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: boolEnv().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_REGION: z.string().optional(),
  POSTMARK_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().optional(),

  // ── SMS ──────────────────────────────────────────────────────────────────────
  SMS_DEFAULT_PROVIDER: z.string().optional(),
  SMS_ALLOWED_COUNTRIES: z.string().optional(),
  SMS_PROVIDER_MAP: z.string().optional(),
  SMS_RATE_LIMIT_SECONDS: z.coerce.number().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  NEXMO_API_KEY: z.string().optional(),
  NEXMO_API_SECRET: z.string().optional(),
  NEXMO_PHONE_NUMBER: z.string().optional(),
  CLICKATELL_API_KEY: z.string().optional(),
  NETGSM_USER_CODE: z.string().optional(),
  NETGSM_PASSWORD: z.string().optional(),
  NETGSM_PHONE_NUMBER: z.string().optional(),

  // ── Storage (AWS S3) ─────────────────────────────────────────────────────────
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_ACCESS_KEY_ID: z.string().optional(),
  AWS_S3_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),

  // ── SSO providers ───────────────────────────────────────────────────────────
  SSO_ALLOWED_PROVIDERS: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  META_CLIENT_ID: z.string().optional(),
  META_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  AUTODESK_CLIENT_ID: z.string().optional(),
  AUTODESK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_APP_SECRET: z.string().optional(),
  // Russia / China consumer SSO
  YANDEX_CLIENT_ID: z.string().optional(),
  YANDEX_CLIENT_SECRET: z.string().optional(),
  VK_CLIENT_ID: z.string().optional(),
  VK_CLIENT_SECRET: z.string().optional(),
  QQ_CLIENT_ID: z.string().optional(),
  QQ_CLIENT_SECRET: z.string().optional(),
  WEIBO_CLIENT_ID: z.string().optional(),
  WEIBO_CLIENT_SECRET: z.string().optional(),
  // Alipay uses RSA2 request signing: app id + PEM private key (+ Alipay public key for response verify).
  ALIPAY_APP_ID: z.string().optional(),
  ALIPAY_PRIVATE_KEY: z.string().optional(),
  ALIPAY_PUBLIC_KEY: z.string().optional(),

  // ── National identity providers (auth_acs) ──────────────────────────────────
  // Single validated JSON blob keyed by provider (mirrors EID_PROVIDER_MAP).
  // e.g. {"tr_edevlet":{"enabled":true,"idpSsoUrl":"…","idpCertificate":"…","spPrivateKey":"…"}}
  ACS_PROVIDER_MAP: z.string().optional(),

  // ── AI providers ────────────────────────────────────────────────────────────
  AI_DEFAULT_PROVIDER: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_DEFAULT_MODEL: z.string().optional(),
  OPENAI_MAX_TOKENS: z.coerce.number().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_DEFAULT_MODEL: z.string().optional(),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_DEFAULT_MODEL: z.string().optional(),
  GOOGLE_MAX_TOKENS: z.coerce.number().optional(),

  // ── Payment ──────────────────────────────────────────────────────────────────
  PAYMENT_DEFAULT_PROVIDER: z.string().optional(),
};
