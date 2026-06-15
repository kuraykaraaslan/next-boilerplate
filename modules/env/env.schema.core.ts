import { z } from 'zod';
import { boolEnv } from './env.schema.shared';

// Core platform env fields: runtime, DB, Redis, messaging WS, auth secrets,
// session/OTP/TOTP/WebAuthn TTLs, multi-tenancy, application + frontend paths.
export const coreFields = {
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

  // ── Messaging WebSocket service (standalone Socket.IO process) ───────────────
  MESSAGING_WS_PORT: z.coerce.number().default(4001),
  // Public URL the browser connects to (returned alongside the WS ticket).
  MESSAGING_WS_PUBLIC_URL: z.string().optional(),
  // CORS origin allowed by the WS server (defaults to permissive in dev).
  MESSAGING_WS_CORS_ORIGIN: z.string().optional(),

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
};
