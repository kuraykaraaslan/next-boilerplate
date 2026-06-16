import Logger from '@nb/logger';
import SettingService from '@nb/setting/server/setting.service';

/**
 * Delivery job payload enqueued onto the BullMQ queue and consumed by the
 * webhook delivery worker.
 */
export interface DeliveryJobData {
  deliveryId: string;
  tenantId: string;
  webhookId: string;
  url: string;
  secret: string;
  /** Set during a secret-rotation window; receivers can use either signature. */
  previousSecret?: string | null;
  event: string;
  payload: Record<string, unknown>;
  requestBody: string;
  /** Per-endpoint custom headers, sanitized of reserved names before sending. */
  headers?: Record<string, string> | null;
  /** SSRF override: destination must resolve into one of these IPs/CIDRs. */
  ipAllowlist?: string[] | null;
}

export const MAX_ATTEMPTS = 3;
// Exponential backoff: attempt 1 → 60s, attempt 2 → 300s, attempt 3 → 900s
export const RETRY_DELAYS_MS = [60_000, 300_000, 900_000];
export const REQUEST_TIMEOUT_MS = 15_000;

// Setting keys (see webhook.settings.fields.ts) read per-tenant at dispatch /
// delivery time. Absent or unparseable values fall back to the constants above.
const SETTING_MAX_ATTEMPTS = 'webhookMaxAttempts';
const SETTING_RETRY_DELAYS = 'webhookRetryDelaysMs';
const SETTING_REQUEST_TIMEOUT = 'webhookRequestTimeoutMs';
const SETTING_CIRCUIT_BREAKER_THRESHOLD = 'webhookCircuitBreakerThreshold';
const SETTING_DEFAULT_RATE_LIMIT = 'webhookDefaultRateLimitPerMinute';

const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 10;

export interface DeliveryConfig {
  maxAttempts: number;
  retryDelaysMs: number[];
  timeoutMs: number;
  /** Auto-disable an endpoint after this many consecutive failed deliveries. */
  circuitBreakerThreshold: number;
  /** Fallback per-endpoint rate limit (deliveries/min) when a webhook has none. Null = unlimited. */
  defaultRateLimitPerMinute: number | null;
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  maxAttempts: MAX_ATTEMPTS,
  retryDelaysMs: RETRY_DELAYS_MS,
  timeoutMs: REQUEST_TIMEOUT_MS,
  circuitBreakerThreshold: DEFAULT_CIRCUIT_BREAKER_THRESHOLD,
  defaultRateLimitPerMinute: null,
};

function parseIntBounded(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Resolve the per-tenant delivery tuning (max attempts, retry backoff, request
 * timeout) from the settings store, falling back to the module defaults for any
 * key that is missing or unparseable. Settings are Redis-cached by
 * {@link SettingService}, so this is cheap to call on the hot path. Best-effort:
 * any failure resolves to {@link DEFAULT_DELIVERY_CONFIG} so delivery never
 * breaks on a settings read.
 */
export async function resolveDeliveryConfig(tenantId: string): Promise<DeliveryConfig> {
  try {
    const values = await SettingService.getByKeys(tenantId, [
      SETTING_MAX_ATTEMPTS,
      SETTING_RETRY_DELAYS,
      SETTING_REQUEST_TIMEOUT,
      SETTING_CIRCUIT_BREAKER_THRESHOLD,
      SETTING_DEFAULT_RATE_LIMIT,
    ]);

    const maxAttempts = parseIntBounded(values[SETTING_MAX_ATTEMPTS], MAX_ATTEMPTS, 1, 10);
    const timeoutMs = parseIntBounded(values[SETTING_REQUEST_TIMEOUT], REQUEST_TIMEOUT_MS, 1_000, 120_000);
    const circuitBreakerThreshold = parseIntBounded(values[SETTING_CIRCUIT_BREAKER_THRESHOLD], DEFAULT_CIRCUIT_BREAKER_THRESHOLD, 1, 100_000);

    const rawRateLimit = Number.parseInt(values[SETTING_DEFAULT_RATE_LIMIT] ?? '', 10);
    const defaultRateLimitPerMinute = Number.isFinite(rawRateLimit) && rawRateLimit > 0 ? rawRateLimit : null;

    const retryDelaysMs = (() => {
      const raw = values[SETTING_RETRY_DELAYS];
      if (!raw) return RETRY_DELAYS_MS;
      const parsed = raw
        .split(',')
        .map((p) => Number(p.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0);
      return parsed.length > 0 ? parsed : RETRY_DELAYS_MS;
    })();

    return { maxAttempts, retryDelaysMs, timeoutMs, circuitBreakerThreshold, defaultRateLimitPerMinute };
  } catch (err) {
    Logger.warn(
      `[Webhook] resolveDeliveryConfig fell back to defaults for tenant=${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return DEFAULT_DELIVERY_CONFIG;
  }
}
