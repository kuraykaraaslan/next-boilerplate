import 'reflect-metadata'
import { z } from 'zod'
import redis from '@/modules/redis'

/**
 * Core Web Vitals RUM ingestion + aggregation, per tenant. Real, no-mock: the
 * frontend `web-vitals` beacon POSTs field measurements to the ingestion route,
 * which calls `record()`; aggregates are computed from the actual collected
 * samples (sample-based p75 over the most recent N readings, the standard CWV
 * reporting percentile). Country breakdown is supported for multi-country
 * tenants.
 */

export const WebVitalMetricEnum = z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'])
export type WebVitalMetric = z.infer<typeof WebVitalMetricEnum>

export const RecordWebVitalDTO = z.object({
  name: WebVitalMetricEnum,
  value: z.number().nonnegative(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  page: z.string().max(512).optional(),
  country: z.string().length(2).optional(),
})
export type RecordWebVitalDTO = z.infer<typeof RecordWebVitalDTO>

// Standard Core Web Vitals thresholds (good ≤ / poor >).
const THRESHOLDS: Record<WebVitalMetric, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
}

const SAMPLE_CAP = 1000   // most-recent samples retained per metric/country
const SAMPLE_TTL = 60 * 60 * 24 * 30 // 30 days

export interface WebVitalSummary {
  metric: WebVitalMetric
  count: number
  p75: number | null
  avg: number | null
  rating: 'good' | 'needs-improvement' | 'poor' | null
  distribution: { good: number; needsImprovement: number; poor: number }
}

export default class SeoWebVitalsService {

  private static key(tenantId: string, metric: string, country?: string) {
    return country
      ? `seo:cwv:${tenantId}:${metric}:${country.toUpperCase()}`
      : `seo:cwv:${tenantId}:${metric}`
  }

  private static rate(metric: WebVitalMetric, value: number): 'good' | 'needs-improvement' | 'poor' {
    const t = THRESHOLDS[metric]
    if (value <= t.good) return 'good'
    if (value > t.poor) return 'poor'
    return 'needs-improvement'
  }

  /** Ingest a single field measurement (called by the beacon route). */
  static async record(tenantId: string, dto: RecordWebVitalDTO): Promise<void> {
    const sample = JSON.stringify({ v: dto.value, t: Date.now() })
    const write = async (key: string) => {
      try {
        await redis.lpush(key, sample)
        await redis.ltrim(key, 0, SAMPLE_CAP - 1)
        await redis.expire(key, SAMPLE_TTL)
      } catch { /* fail-open: RUM ingestion must never break a page load */ }
    }
    await write(this.key(tenantId, dto.name))
    if (dto.country) {
      await write(this.key(tenantId, dto.name, dto.country))
      await redis.sadd(`seo:cwv:countries:${tenantId}`, dto.country.toUpperCase()).catch(() => {})
    }
  }

  private static async summarize(tenantId: string, metric: WebVitalMetric, country?: string): Promise<WebVitalSummary> {
    let values: number[] = []
    try {
      const raw = await redis.lrange(this.key(tenantId, metric, country), 0, -1)
      values = raw.map((r) => { try { return Number(JSON.parse(r).v) } catch { return NaN } }).filter((n) => !Number.isNaN(n))
    } catch { /* fall through to empty */ }

    if (values.length === 0) {
      return { metric, count: 0, p75: null, avg: null, rating: null, distribution: { good: 0, needsImprovement: 0, poor: 0 } }
    }
    const sorted = [...values].sort((a, b) => a - b)
    const p75 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))]
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const dist = { good: 0, needsImprovement: 0, poor: 0 }
    for (const v of values) {
      const r = this.rate(metric, v)
      if (r === 'good') dist.good++
      else if (r === 'poor') dist.poor++
      else dist.needsImprovement++
    }
    const round = metric === 'CLS' ? (n: number) => Math.round(n * 1000) / 1000 : (n: number) => Math.round(n)
    return {
      metric, count: values.length,
      p75: round(p75), avg: round(avg),
      rating: this.rate(metric, p75),
      distribution: dist,
    }
  }

  /** Per-metric CWV report for a tenant, optionally filtered to one country. */
  static async getReport(tenantId: string, opts?: { country?: string }): Promise<WebVitalSummary[]> {
    const metrics = WebVitalMetricEnum.options
    return Promise.all(metrics.map((m) => this.summarize(tenantId, m, opts?.country)))
  }

  /** Countries that have reported at least one measurement. */
  static async reportedCountries(tenantId: string): Promise<string[]> {
    return redis.smembers(`seo:cwv:countries:${tenantId}`).catch(() => [])
  }
}
