import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { PAYMENT_MESSAGES } from './payment_core.messages';

/**
 * Per-provider circuit breaker for outbound payment-gateway calls. A provider
 * that keeps failing (timeouts / 5xx) is "opened" for a cool-down window so we
 * stop hammering it and fail fast instead of blocking checkout threads. State
 * lives in Redis so it is shared across pods; on a Redis outage it fails open
 * (calls are allowed) — a cache problem must never block all payments.
 *
 * Keys:
 *   pay:cb:fail:<provider>   rolling failure count (TTL = window)
 *   pay:cb:open:<provider>   present while the breaker is open (TTL = cooldown)
 */
const FAILURE_THRESHOLD = 5;      // failures within the window to trip
const FAILURE_WINDOW_SEC = 60;    // rolling window
const OPEN_COOLDOWN_SEC = 30;     // how long the breaker stays open

export default class PaymentCircuitBreaker {
  private static failKey(p: string) { return `pay:cb:fail:${p}`; }
  private static openKey(p: string) { return `pay:cb:open:${p}`; }

  /** True when the breaker is open (calls should be rejected fast). */
  static async isOpen(provider: string): Promise<boolean> {
    try { return (await redis.exists(PaymentCircuitBreaker.openKey(provider))) === 1; }
    catch { return false; } // fail open
  }

  static async recordSuccess(provider: string): Promise<void> {
    try { await redis.del(PaymentCircuitBreaker.failKey(provider)); } catch { /* ignore */ }
  }

  static async recordFailure(provider: string): Promise<void> {
    try {
      const key = PaymentCircuitBreaker.failKey(provider);
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, FAILURE_WINDOW_SEC);
      if (n >= FAILURE_THRESHOLD) {
        await redis.set(PaymentCircuitBreaker.openKey(provider), '1', 'EX', OPEN_COOLDOWN_SEC);
        await redis.del(key);
        Logger.warn(`[payment.circuit] breaker OPEN for ${provider} (${n} failures) — cooling down ${OPEN_COOLDOWN_SEC}s`);
      }
    } catch { /* fail open */ }
  }

  /**
   * Wrap a provider call: reject fast when open, otherwise run and record the
   * outcome. Only counts infrastructure failures (network/timeout/5xx) toward
   * tripping — `AppError` (business rejections like card declined) does not.
   */
  static async run<T>(provider: string, fn: () => Promise<T>): Promise<T> {
    if (await PaymentCircuitBreaker.isOpen(provider)) {
      throw new AppError(PAYMENT_MESSAGES.PROVIDER_UNAVAILABLE, 503, ErrorCode.INTERNAL_ERROR);
    }
    try {
      const result = await fn();
      await PaymentCircuitBreaker.recordSuccess(provider);
      return result;
    } catch (err) {
      if (!(err instanceof AppError)) await PaymentCircuitBreaker.recordFailure(provider);
      throw err;
    }
  }
}
