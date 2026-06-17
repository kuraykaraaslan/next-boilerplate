import redis from '@kuraykaraaslan/redis'
import Logger from '@kuraykaraaslan/logger'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import { NotificationLog } from '@kuraykaraaslan/notification_log/server/entities/notification_log.entity'

/**
 * SMS deliverability + compliance helpers: provider circuit breaker, delivery-
 * receipt ingestion, sender-ID / DLT (India) resolution, GSM/Unicode segment
 * accounting, PII redaction for logs, and per-tenant delivery analytics.
 */
export default class NotificationSmsDeliveryService {

  // ── Circuit breaker (per tenant+provider) ──────────────────────────────────
  private static readonly CB_THRESHOLD = 5     // consecutive failures to trip
  private static readonly CB_COOLDOWN = 120    // seconds the breaker stays open

  private static cbKey(tenantId: string, provider: string) { return `sms:cb:${tenantId}:${provider}` }

  /** True when the provider's breaker is closed (healthy / allowed to send). */
  static async isProviderHealthy(tenantId: string, provider: string): Promise<boolean> {
    try {
      const open = await redis.get(`${this.cbKey(tenantId, provider)}:open`)
      return open === null
    } catch { return true } // fail-open
  }

  /** Record a provider send outcome; trips the breaker after N failures. */
  static async recordProviderResult(tenantId: string, provider: string, ok: boolean): Promise<void> {
    const key = this.cbKey(tenantId, provider)
    try {
      if (ok) { await redis.del(key); return }
      const fails = await redis.incr(key)
      if (fails === 1) await redis.expire(key, this.CB_COOLDOWN)
      if (fails >= this.CB_THRESHOLD) {
        await redis.set(`${key}:open`, '1', 'EX', this.CB_COOLDOWN)
        Logger.warn(`[sms] circuit breaker OPEN for ${provider} (tenant ${tenantId})`)
      }
    } catch { /* ignore breaker bookkeeping errors */ }
  }

  // ── Delivery receipts (provider status callbacks) ──────────────────────────

  /**
   * Ingest a provider delivery-receipt callback: updates the matching
   * notification_log row's status by providerMessageId. Route handlers for
   * Twilio/Vonage/etc. status webhooks call this.
   */
  static async handleDeliveryReceipt(
    tenantId: string,
    dto: { providerMessageId: string; status: 'delivered' | 'failed' | 'sent'; error?: string },
  ): Promise<boolean> {
    try {
      const ds = await tenantDataSourceFor(tenantId)
      const repo = ds.getRepository(NotificationLog)
      const row = await repo.findOne({ where: { tenantId, providerMessageId: dto.providerMessageId } })
      if (!row) return false
      row.status = dto.status === 'delivered' ? 'sent' : dto.status === 'failed' ? 'failed' : row.status
      if (dto.error) row.error = dto.error
      await repo.save(row)
      const month = new Date().toISOString().slice(0, 7)
      await redis.hincrby(`sms:metrics:${tenantId}:${month}`, dto.status, 1).catch(() => {})
      return true
    } catch (e) {
      Logger.warn(`[sms] delivery receipt failed: ${e instanceof Error ? e.message : e}`)
      return false
    }
  }

  // ── Sender ID / DLT (per country) ──────────────────────────────────────────

  /**
   * Resolve the sender ID / originator for a destination country. Reads the
   * per-tenant `smsSenderIds` map ({"IN":"MYBRAND",...}) and falls back to
   * `smsDefaultSenderId`. India also requires a DLT template id (`smsDltTemplateId`).
   */
  static async resolveSender(tenantId: string, regionCode: string): Promise<{ senderId?: string; dltTemplateId?: string }> {
    const s = await SettingService.getByKeys(tenantId, ['smsSenderIds', 'smsDefaultSenderId', 'smsDltTemplateId'])
      .catch(() => ({} as Record<string, string | null>))
    let senderId = s.smsDefaultSenderId ?? undefined
    if (s.smsSenderIds) {
      try {
        const map = JSON.parse(s.smsSenderIds) as Record<string, string>
        if (map[regionCode.toUpperCase()]) senderId = map[regionCode.toUpperCase()]
      } catch { /* ignore malformed map */ }
    }
    const dltTemplateId = regionCode.toUpperCase() === 'IN' ? (s.smsDltTemplateId ?? undefined) : undefined
    return { senderId, dltTemplateId }
  }

  /** Per-tenant region→provider routing override (`smsRegionProviderMap` JSON). */
  static async resolveRegionProvider(tenantId: string, regionCode: string): Promise<string | null> {
    const raw = await SettingService.getValue(tenantId, 'smsRegionProviderMap').catch(() => null)
    if (!raw) return null
    try {
      const map = JSON.parse(raw) as Record<string, string>
      return map[regionCode.toUpperCase()] ?? null
    } catch { return null }
  }

  // ── Message accounting (GSM-7 vs UCS-2 / Unicode) ──────────────────────────

  /**
   * Compute SMS segment count + encoding. Any character outside Latin-1 (e.g.
   * Turkish s-cedilla / g-breve, Arabic, CJK, emoji) forces UCS-2 (70/67 per
   * segment); otherwise GSM-7 (160/153). This determines real per-message cost
   * and is essential for non-Latin markets.
   */
  static segments(text: string): { encoding: 'GSM-7' | 'UCS-2'; length: number; segments: number } {
    let unicode = false
    for (const ch of text) {
      if ((ch.codePointAt(0) ?? 0) > 0x00ff) { unicode = true; break }
    }
    const len = [...text].length
    if (!unicode) {
      return { encoding: 'GSM-7', length: len, segments: len <= 160 ? 1 : Math.ceil(len / 153) }
    }
    return { encoding: 'UCS-2', length: len, segments: len <= 70 ? 1 : Math.ceil(len / 67) }
  }

  /** Redact phone numbers and obvious OTP/PII patterns before logging a body. */
  static redactForLog(text: string): string {
    return text
      .replace(/\+?\d[\d\s().-]{6,}\d/g, '[redacted-number]')
      .replace(/\b\d{4,8}\b/g, '[redacted-code]')
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  /** Per-tenant SMS delivery analytics from the notification_log (status counts). */
  static async getAnalytics(tenantId: string, opts?: { from?: Date; to?: Date }): Promise<{ sent: number; failed: number; pending: number; total: number; successRate: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const qb = ds.getRepository(NotificationLog).createQueryBuilder('n')
      .select('n.status', 'status').addSelect('COUNT(*)', 'count')
      .where('n."tenantId" = :tenantId AND n."channel" = :channel', { tenantId, channel: 'sms' })
    if (opts?.from) qb.andWhere('n."sentAt" >= :from', { from: opts.from })
    if (opts?.to) qb.andWhere('n."sentAt" <= :to', { to: opts.to })
    const rows = await qb.groupBy('n.status').getRawMany<{ status: string; count: string }>()
    const counts = { sent: 0, failed: 0, pending: 0 }
    for (const r of rows) {
      if (r.status in counts) counts[r.status as keyof typeof counts] = Number(r.count)
    }
    const total = counts.sent + counts.failed + counts.pending
    return { ...counts, total, successRate: total ? Math.round((counts.sent / total) * 1000) / 10 : 0 }
  }

  // ── Queue depth ────────────────────────────────────────────────────────────

  /** Current SMS queue backlog (waiting + delayed) for throttling decisions. */
  static async queueDepth(): Promise<number> {
    try {
      const mod = await import('./notification_sms.queue.service')
      const svc = (mod.default ?? (mod as Record<string, unknown>).NotificationSmsQueueService) as { QUEUE: { getWaitingCount(): Promise<number>; getDelayedCount(): Promise<number> } }
      const q = svc.QUEUE
      const [waiting, delayed] = await Promise.all([q.getWaitingCount(), q.getDelayedCount()])
      return waiting + delayed
    } catch { return 0 }
  }
}
