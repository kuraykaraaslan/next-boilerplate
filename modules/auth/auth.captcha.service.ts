import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import SettingService from '@/modules/setting/setting.service';

/**
 * KD-19: brute-force CAPTCHA threshold.
 * Tracks per-identity failed-login counters in Redis with a 30 min rolling
 * window. Once the count crosses the configured threshold, the next login
 * attempt MUST present a CAPTCHA token verified against the configured
 * reCAPTCHA server key.
 */
const WINDOW_SECONDS = 60 * 30;

function key(email: string): string {
  return `auth:captcha-counter:${email.toLowerCase()}`;
}

export default class CaptchaService {
  static async isRequired(email: string, triggerAttempts: number): Promise<boolean> {
    if (triggerAttempts <= 0) return false;
    const count = parseInt((await redis.get(key(email))) ?? '0', 10);
    return count >= triggerAttempts;
  }

  static async recordFailure(email: string): Promise<void> {
    const k = key(email);
    const count = await redis.incr(k);
    if (count === 1) await redis.expire(k, WINDOW_SECONDS);
  }

  static async clear(email: string): Promise<void> {
    await redis.del(key(email)).catch(() => {});
  }

  /**
   * Verify a reCAPTCHA token against the configured Google secret.
   * Returns false when no secret is configured (fail-closed by intent —
   * if you enable the threshold you must also configure the secret).
   */
  static async verify(token: string): Promise<boolean> {
    if (!token) return false;
    const secret = await SettingService.getValue('recaptchaServerKey');
    if (!secret) {
      Logger.warn('CaptchaService.verify: recaptchaServerKey is not set; rejecting captcha token');
      return false;
    }
    try {
      const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }),
      });
      const data = (await resp.json().catch(() => null)) as { success?: boolean } | null;
      return !!data?.success;
    } catch (err: unknown) {
      Logger.warn(`CaptchaService.verify: request failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
