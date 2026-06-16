import Logger from '@nb/logger';
import { getStats } from './notification_log.read.service';

/**
 * Sustained-failure alert: if the failure rate over the recent window exceeds
 * `threshold` (default 50%) with at least `minVolume` attempts, dispatch a
 * `notification.failure_rate_high` webhook. Deduped per hour. Returns whether
 * an alert fired.
 */
export async function checkFailureRate(
  tenantId: string, opts: { windowMinutes?: number; threshold?: number; minVolume?: number } = {},
): Promise<boolean> {
  const windowMinutes = opts.windowMinutes ?? 30;
  const threshold = opts.threshold ?? 50;
  const minVolume = opts.minVolume ?? 20;
  const from = new Date(Date.now() - windowMinutes * 60 * 1000);
  const stats = await getStats(tenantId, { from });
  const { sent, failed } = stats.overall;
  const volume = sent + failed;
  if (volume < minVolume) return false;
  const failureRate = Math.round((failed / volume) * 1000) / 10;
  if (failureRate < threshold) return false;

  try {
    const { default: redis } = await import('@nb/redis');
    const dedupKey = `notiflog:failalert:${tenantId}:${new Date().toISOString().slice(0, 13)}`; // per hour
    const set = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');
    if (set === null) return false;
  } catch { /* fail-open on dedup */ }

  try {
    const { default: WebhookService } = await import('@nb/webhook/server/webhook.service');
    await WebhookService.dispatchEvent(tenantId, 'notification.failure_rate_high', {
      windowMinutes, failureRate, volume, failed, sent, byChannel: stats.byChannel,
    });
  } catch (e) {
    Logger.warn(`[notification_log] failure-rate webhook failed: ${e instanceof Error ? e.message : e}`);
  }
  return true;
}
