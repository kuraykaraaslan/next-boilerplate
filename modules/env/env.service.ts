import { z } from 'zod';

const EnvSchema = z.object({
  // ── Core ────────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test', 'vercel']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().optional(),
  DEBUG: z.coerce.boolean().optional(),
  DEBUG_LOCAL: z.coerce.boolean().optional(),
  DEBUG_TESTS: z.coerce.boolean().optional(),
  DEBUG_TESTS_REAL_SERVER: z.coerce.boolean().optional(),

  // ── Databases ───────────────────────────────────────────────────────────────
  SYSTEM_DATABASE_URL: z.string().min(1),
  TENANT_DATABASE_URL: z.string().min(1),

  // ── Redis ───────────────────────────────────────────────────────────────────
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // ── Auth / Secrets ──────────────────────────────────────────────────────────
  ACCESS_TOKEN_SECRET: z.string().min(1),
  ACCESS_TOKEN_EXPIRES_IN: z.string().optional(),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  REFRESH_TOKEN_EXPIRES_IN: z.string().optional(),
  CSRF_SECRET: z.string().min(1),

  // ── Session / Token TTLs ────────────────────────────────────────────────────
  SESSION_CACHE_TTL: z.coerce.number().default(1800),
  SESSION_EXPIRY_MS: z.coerce.number().optional(),
  RESET_TOKEN_EXPIRY_SECONDS: z.coerce.number().optional(),
  RESET_TOKEN_LENGTH: z.coerce.number().optional(),
  EMAIL_VERIFY_TTL_SECONDS: z.coerce.number().optional(),
  EMAIL_VERIFY_RATE_LIMIT_SECONDS: z.coerce.number().optional(),
  INVITATION_TTL_SECONDS: z.coerce.number().optional(),

  // ── OTP ─────────────────────────────────────────────────────────────────────
  OTP_LENGTH: z.coerce.number().optional(),
  OTP_EXPIRY_SECONDS: z.coerce.number().optional(),
  OTP_MAX_ATTEMPTS: z.coerce.number().optional(),
  OTP_RATE_LIMIT_SECONDS: z.coerce.number().optional(),

  // ── TOTP ─────────────────────────────────────────────────────────────────────
  TOTP_ISSUER: z.string().optional(),
  TOTP_STEP_SECONDS: z.coerce.number().optional(),
  TOTP_SETUP_EXPIRY_SECONDS: z.coerce.number().optional(),
  TOTP_WINDOW: z.coerce.number().optional(),

  // ── WebAuthn ────────────────────────────────────────────────────────────────
  WEBAUTHN_ORIGIN: z.string().optional(),
  WEBAUTHN_RP_ID: z.string().optional(),

  // ── Multi-tenancy ───────────────────────────────────────────────────────────
  TENANCY_MODE: z.enum(['domain', 'subdomain', 'path']).default('domain'),
  TENANT_WILDCARD_DOMAIN: z.string().optional(),
  TENANT_DEFAULT_SUBDOMAIN: z.string().optional(),
  TENANT_PATH_PREFIX: z.string().optional(),
  TENANT_CACHE_TTL: z.coerce.number().optional(),
  VERIFICATION_DOMAIN: z.string().optional(),

  // ── Application ─────────────────────────────────────────────────────────────
  APPLICATION_NAME: z.string().optional(),
  APPLICATION_DOMAIN: z.string().optional(),
  APPLICATION_HOST: z.string().optional(),
  APPLICATION_LOGO_TEXT: z.string().optional(),
  INFORM_MAIL: z.string().optional(),
  INFORM_NAME: z.string().optional(),

  // ── Frontend paths ──────────────────────────────────────────────────────────
  FRONTEND_LOGIN_PATH: z.string().optional(),
  FRONTEND_REGISTER_PATH: z.string().optional(),
  FRONTEND_FORGOT_PASSWORD_PATH: z.string().optional(),
  FRONTEND_RESET_PASSWORD_PATH: z.string().optional(),
  FRONTEND_PRIVACY_PATH: z.string().optional(),
  FRONTEND_TERMS_PATH: z.string().optional(),
  FRONTEND_SUPPORT_EMAIL: z.string().optional(),

  // ── NEXT_PUBLIC ─────────────────────────────────────────────────────────────
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_APPLICATION_HOST: z.string().optional(),
  NEXT_PUBLIC_APPLICATION_NAME: z.string().optional(),
  NEXT_PUBLIC_TENANT_WILDCARD_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_TINYMCE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  // ── Push notifications (VAPID) ──────────────────────────────────────────────
  VAPID_CONTACT_EMAIL: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  // ── Mail ─────────────────────────────────────────────────────────────────────
  MAIL_PROVIDER: z.string().default('smtp'),
  MAIL_FROM: z.string().optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
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

  // ── Cron ─────────────────────────────────────────────────────────────────────
  CRON_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),

  // ── Misc ─────────────────────────────────────────────────────────────────────
  BOOK_LANG: z.string().optional(),
  DOTENV_KEY: z.string().optional(),
  NEXT_DEPLOYMENT_ID: z.string().optional(),
  NODE_DISABLE_COLORS: z.string().optional(),
  NODE_UNIQUE_ID: z.string().optional(),
  UNIX: z.string().optional(),
  PATH: z.string().optional(),

  // ── Rate Limiting ───────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().default(100), // limit each IP to 100 requests per windowMs
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(60 * 60 * 1000), // 1 hour
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(500), // limit each IP to 500 requests per auth windowMs
});

export const env = EnvSchema.parse(process.env);
