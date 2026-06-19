import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';

import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
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
   * Verify a CAPTCHA token against the configured provider. CAPTCHA providers are
   * SANDBOXED community plugins (the @captcha/* family — reCAPTCHA / hCaptcha /
   * Turnstile) resolved platform-wide (ROOT tenant) via the external-contributions
   * bridge; the provider secret stays host-side. Fail-CLOSED: returns false when no
   * provider is installed/configured or verification errors (if you enable the
   * CAPTCHA threshold you must install + configure a provider).
   */
  static async verify(token: string): Promise<boolean> {
    if (!token) return false;
    try {
      const { listExternalContributions } = await import('@kuraykaraaslan/common/server/external-extensions');
      const exts = await listExternalContributions(ROOT_TENANT_ID, 'captcha:provider');
      if (exts.length === 0) {
        Logger.warn('CaptchaService.verify: no captcha provider installed; rejecting captcha token');
        return false;
      }
      const wanted = (await SettingService.getValue(ROOT_TENANT_ID, 'captchaProvider').catch(() => null)) || 'recaptcha';
      const ext = exts.find((c) => c.key === wanted) ?? exts.find((c) => c.configured) ?? exts[0];
      const res = (await ext.invoke('verify', { token })) as { success?: boolean } | null;
      return !!res?.success;
    } catch (err: unknown) {
      Logger.warn(`CaptchaService.verify: request failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
