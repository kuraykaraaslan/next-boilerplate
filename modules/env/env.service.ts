import { z } from 'zod';

// Unlike z.coerce.boolean(), this treats "false"/"0" as false (coerce treats them as truthy).
const boolEnv = () => z.preprocess(v => v === 'true' || v === '1', z.boolean());

// ── Secret field names used for redaction in error output ───────────────────
const SECRET_KEYS = new Set([
  'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'CSRF_SECRET',
  'SMTP_PASS', 'MAILGUN_API_KEY', 'POSTMARK_API_KEY', 'SENDGRID_API_KEY',
  'RESEND_API_KEY', 'AWS_SES_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_SECRET_ACCESS_KEY', 'TWILIO_AUTH_TOKEN', 'NEXMO_API_SECRET',
  'CLICKATELL_API_KEY', 'NETGSM_PASSWORD', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'GOOGLE_AI_API_KEY', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_SECRET',
  'APPLE_PRIVATE_KEY', 'META_CLIENT_SECRET', 'MICROSOFT_CLIENT_SECRET',
  'AUTODESK_CLIENT_SECRET', 'LINKEDIN_CLIENT_SECRET', 'TIKTOK_CLIENT_SECRET',
  'TWITTER_CLIENT_SECRET', 'WECHAT_APP_SECRET', 'CRON_SECRET', 'DOTENV_KEY',
  'SETTINGS_ENCRYPTION_KEY', 'LOTL_SIGNER_CERT_PEM', 'MOBIL_IMZA_AGGREGATOR_API_KEY',
  'MOBIL_IMZA_CALLBACK_HMAC_SECRET', 'SMART_ID_RELYING_PARTY_UUID',
  'BANKID_SE_CLIENT_KEY_PATH', 'VAPID_PRIVATE_KEY', 'METRICS_SECRET',
]);

const EnvSchema = z.object({
  // ── Core ────────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test', 'vercel']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().optional(),
  DEBUG: boolEnv().optional(),
  DEBUG_LOCAL: boolEnv().optional(),
  DEBUG_TESTS: boolEnv().optional(),
  DEBUG_TESTS_REAL_SERVER: boolEnv().optional(),

  // ── Database ────────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1),
  DATABASE_READ_REPLICA_URL: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_SLOW_QUERY_THRESHOLD_MS: z.coerce.number().default(1000),

  // ── Redis ───────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().default('redis://localhost:6379'),
  // Sentinel mode: comma-separated host:port pairs (e.g. sentinel1:26379,sentinel2:26379)
  REDIS_SENTINELS: z.string().optional(),
  REDIS_SENTINEL_NAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_SENTINEL_PASSWORD: z.string().optional(),
  // Per-tenant query timeout (ms). 0 = disabled.
  DB_QUERY_TIMEOUT_MS: z.coerce.number().default(0),
  // Inactive user auto-deactivation (days). 0 = disabled.
  USER_INACTIVE_DAYS: z.coerce.number().default(0),

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
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(60 * 60 * 1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(500),

  // ── E-Signature / E-Identity (eIDAS, OIDC4IDA) ──────────────────────────────
  EID_DEFAULT_PROVIDER: z.string().optional(),
  EID_PROVIDER_MAP: z.string().optional(),
  EID_REQUIRED_LOA: z.enum(['low', 'substantial', 'high']).optional(),
  EU_LOTL_URL: z.string().optional(),
  LOTL_SIGNER_CERT_PEM: z.string().optional(),
  TR_TRUST_ROOTS_PATH: z.string().optional(),
  TSA_DEFAULT_URL: z.string().optional(),
  MOBIL_IMZA_AGGREGATOR_BASE_URL: z.string().optional(),
  MOBIL_IMZA_AGGREGATOR_API_KEY: z.string().optional(),
  MOBIL_IMZA_AGGREGATOR_CUSTOMER_CODE: z.string().optional(),
  MOBIL_IMZA_CALLBACK_HMAC_SECRET: z.string().optional(),
  SMART_ID_BASE_URL: z.string().optional(),
  SMART_ID_RELYING_PARTY_UUID: z.string().optional(),
  SMART_ID_RELYING_PARTY_NAME: z.string().optional(),
  BANKID_SE_BASE_URL: z.string().optional(),
  BANKID_SE_CLIENT_CERT_PATH: z.string().optional(),
  BANKID_SE_CLIENT_KEY_PATH: z.string().optional(),
  LOGIN_GOV_CLIENT_ID: z.string().optional(),
  LOGIN_GOV_REDIRECT_URI: z.string().optional(),
  SETTINGS_ENCRYPTION_KEY: z.string().optional(),

  // ── Observability ───────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  METRICS_ENABLED: boolEnv().default(false),
  METRICS_SECRET: z.string().optional(),
  OTEL_ENABLED: boolEnv().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default('next-boilerplate'),
  ENABLE_BACKGROUND_JOBS: boolEnv().default(false),
  APPLICATION_VERSION: z.string().default('dev'),

  // ── Secrets manager (AWS SSM / HashiCorp Vault) ─────────────────────────────
  // When set, env.service will call the registered secrets loader at boot.
  SECRETS_MANAGER_PROVIDER: z.enum(['aws_ssm', 'vault', 'none']).default('none'),
  SECRETS_MANAGER_PREFIX: z.string().optional(),
  VAULT_ADDR: z.string().optional(),
  VAULT_TOKEN: z.string().optional(),
  VAULT_PATH: z.string().optional(),
}).superRefine((data, ctx) => {
  // Conditional required vars per mail provider
  if (data.MAIL_PROVIDER === 'smtp' && !data.SMTP_HOST) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_HOST'], message: 'SMTP_HOST is required when MAIL_PROVIDER=smtp' });
  }
  if (data.MAIL_PROVIDER === 'mailgun' && !data.MAILGUN_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MAILGUN_API_KEY'], message: 'MAILGUN_API_KEY is required when MAIL_PROVIDER=mailgun' });
  }
  if (data.MAIL_PROVIDER === 'postmark' && !data.POSTMARK_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['POSTMARK_API_KEY'], message: 'POSTMARK_API_KEY is required when MAIL_PROVIDER=postmark' });
  }
  if (data.MAIL_PROVIDER === 'sendgrid' && !data.SENDGRID_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SENDGRID_API_KEY'], message: 'SENDGRID_API_KEY is required when MAIL_PROVIDER=sendgrid' });
  }
  if (data.MAIL_PROVIDER === 'resend' && !data.RESEND_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['RESEND_API_KEY'], message: 'RESEND_API_KEY is required when MAIL_PROVIDER=resend' });
  }
  if (data.SECRETS_MANAGER_PROVIDER === 'vault' && !data.VAULT_ADDR) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['VAULT_ADDR'], message: 'VAULT_ADDR is required when SECRETS_MANAGER_PROVIDER=vault' });
  }
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const flat = result.error.flatten();
    const lines: string[] = ['[env] Boot-time configuration errors — fix all before starting:'];
    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      const redacted = SECRET_KEYS.has(field) ? '[REDACTED]' : (raw[field] ?? '(unset)');
      lines.push(`  ${field} = ${redacted}  →  ${(messages as string[]).join(', ')}`);
    }
    for (const msg of flat.formErrors) {
      lines.push(`  (global)  →  ${msg}`);
    }
    throw new Error(lines.join('\n'));
  }
  return result.data;
}

// ── Secrets manager loader interface ────────────────────────────────────────
export type SecretsLoader = (prefix?: string) => Promise<Record<string, string>>;
let _secretsLoader: SecretsLoader | null = null;

export function registerSecretsLoader(loader: SecretsLoader): void {
  _secretsLoader = loader;
}

// Merges remote secrets into process.env and re-parses. Call once at boot
// (e.g. in Next.js instrumentation.ts) before any module reads `env`.
export async function loadRemoteSecrets(): Promise<void> {
  if (!_secretsLoader) return;
  const parsed = parseEnv(process.env);
  if (parsed.SECRETS_MANAGER_PROVIDER === 'none') return;
  const remote = await _secretsLoader(parsed.SECRETS_MANAGER_PREFIX);
  Object.assign(process.env, remote);
  Object.assign(_env, parseEnv(process.env));
}

// Reload only secret fields from remote without full restart (rotation hook).
export async function reloadSecrets(): Promise<void> {
  await loadRemoteSecrets();
}

// ── Log non-secret active config at startup ──────────────────────────────────
export function logBootConfig(parsed: Env): void {
  const show = (k: string, v: unknown) => `${k}=${SECRET_KEYS.has(k) ? '[secret]' : v}`;
  const items = [
    show('NODE_ENV', parsed.NODE_ENV),
    show('MAIL_PROVIDER', parsed.MAIL_PROVIDER),
    show('SMS_DEFAULT_PROVIDER', parsed.SMS_DEFAULT_PROVIDER ?? 'unset'),
    show('METRICS_ENABLED', parsed.METRICS_ENABLED),
    show('OTEL_ENABLED', parsed.OTEL_ENABLED),
    show('ENABLE_BACKGROUND_JOBS', parsed.ENABLE_BACKGROUND_JOBS),
    show('SECRETS_MANAGER_PROVIDER', parsed.SECRETS_MANAGER_PROVIDER),
    show('DATABASE_READ_REPLICA_URL', parsed.DATABASE_READ_REPLICA_URL ? 'set' : 'unset'),
  ];
  console.info(`[env] Boot config: ${items.join(' | ')}`);
}

// Mutable object for rotation support — `env` reference stays stable.
const _env = parseEnv(process.env);
logBootConfig(_env);

// Freeze to prevent accidental mutation at runtime.
export const env: Readonly<Env> = Object.freeze(_env) as Readonly<Env>;
