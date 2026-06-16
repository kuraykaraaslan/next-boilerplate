'use client'

/**
 * Core Web Vitals field-data reporter. Drop `reportWebVitals(tenantId)` into a
 * client component (e.g. a root layout effect). It uses the standard
 * `web-vitals` library when installed; otherwise it falls back to the native
 * PerformanceObserver for LCP/CLS so the beacon still works with zero deps.
 *
 * Beacons are POSTed to /tenant/{tenantId}/api/seo/web-vitals via
 * navigator.sendBeacon (survives page unload), which calls
 * SeoWebVitalsService.record on the server.
 */

type Metric = { name: string; value: number; rating?: string }

function send(tenantId: string, metric: Metric, country?: string) {
  try {
    const body = JSON.stringify({
      name: metric.name, value: metric.value, rating: metric.rating,
      page: typeof location !== 'undefined' ? location.pathname : undefined,
      country,
    })
    const url = `/tenant/${tenantId}/api/seo/web-vitals`
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else if (typeof fetch !== 'undefined') {
      void fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
    }
  } catch { /* never throw from RUM reporting */ }
}

export async function reportWebVitals(tenantId: string, opts?: { country?: string }): Promise<void> {
  if (typeof window === 'undefined') return
  const country = opts?.country
  try {
    // Preferred path: the official web-vitals library (if the app installs it).
    // Non-literal specifier so this stays optional (not resolved at build time).
    const specifier = 'web-vitals'
    const mod: any = await import(/* webpackIgnore: true */ specifier).catch(() => null)
    if (mod) {
      const report = (m: Metric) => send(tenantId, m, country)
      mod.onLCP?.(report); mod.onINP?.(report); mod.onCLS?.(report)
      mod.onFCP?.(report); mod.onTTFB?.(report)
      return
    }
  } catch { /* fall through to native */ }

  // Zero-dependency fallback: native observers for LCP and CLS.
  try {
    let cls = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true } as never)

    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1] as any
      if (last) send(tenantId, { name: 'LCP', value: last.renderTime || last.loadTime || last.startTime }, country)
    }).observe({ type: 'largest-contentful-paint', buffered: true } as never)

    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') send(tenantId, { name: 'CLS', value: cls }, country)
    }, { once: true })
  } catch { /* unsupported browser — skip */ }
}
