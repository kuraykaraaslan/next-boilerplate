import { z } from 'zod';
import { boolEnv } from './env.schema.shared';

// Platform/ops env fields: cron, misc runtime, rate limiting, e-signature /
// e-identity, observability, secrets manager, deployment region.
export const platformFields = {
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

  // ── Deployment region (typed) — drives per-region env overlay + data residency ─
  DEPLOYMENT_REGION: z.enum([
    'local', 'us-east', 'us-west', 'eu-west', 'eu-central', 'uk', 'tr', 'me', 'apac', 'sa', 'af',
  ]).default('local'),
};
