import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import redis, { jitter, singleFlight } from '@nb/redis'
import Logger from '@nb/logger'
import { EXCHANGE_RATE_MESSAGES } from './exchange_rate.messages'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { ExchangeRateQuoteSchema } from './exchange_rate.types'

/**
 * ExchangeRateService — live FX from TCMB (primary) with a keyless fallback
 * provider, TRY-based cross-rate derivation, and bid/ask spreads.
 *
 * TCMB publishes the full daily table (~20 currencies, each with ForexBuying /
 * ForexSelling and a Unit). We cache the whole table once and serve any pair
 * from it by composing through the TRY base. Pairs TCMB does not cover fall back
 * to a secondary provider. On a TCMB outage we serve the last-known table rather
 * than block checkout; only a cold cache surfaces an error.
 */

type RoundingMode = 'half-up' | 'half-even'
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF', 'XOF', 'XAF'])
function currencyDp(c: string): number { return ZERO_DECIMAL.has(c.toUpperCase()) ? 0 : 2 }
function roundAmount(v: number, dp: number, mode: RoundingMode): number {
  const f = 10 ** dp
  const x = v * f
  if (mode === 'half-even') {
    const fl = Math.floor(x)
    return (Math.abs(x - fl - 0.5) < 1e-9 ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(x)) / f
  }
  return Math.round(x + Number.EPSILON) / f
}

/** TRY per 1 unit of the currency, both sides of the spread. */
interface FxEntry { buying: number; selling: number }
type FxTable = Record<string, FxEntry> // keyed by currency code; always includes TRY = {1,1}

export default class ExchangeRateService {
  private static readonly TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'
  private static readonly TABLE_KEY = 'fx:tcmb:table'
  private static readonly TABLE_LAST_KEY = 'fx:tcmb:table:last'
  private static readonly FETCHED_AT_KEY = 'fx:tcmb:fetchedAt'
  private static readonly CACHE_TTL = 60 * 60 * 6 // 6h
  private static readonly LAST_TTL = 60 * 60 * 24 * 30 // 30d
  private static readonly STALE_AFTER_MS = 60 * 60 * 36 * 1000 // 36h → alert
  private static readonly FETCH_TIMEOUT_MS = 8000

  private static readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })

  // ── TCMB table (primary source) ──────────────────────────────────────────

  private static async getTable(): Promise<FxTable> {
    const cached = await redis.get(ExchangeRateService.TABLE_KEY).catch(() => null)
    if (cached) { try { return JSON.parse(cached) as FxTable } catch { /* refetch */ } }

    return singleFlight(ExchangeRateService.TABLE_KEY, async () => {
      try {
        const res = await axios.get(ExchangeRateService.TCMB_URL, { timeout: ExchangeRateService.FETCH_TIMEOUT_MS, responseType: 'text' })
        const table = ExchangeRateService.parseTable(res.data)
        const json = JSON.stringify(table)
        await Promise.all([
          redis.setex(ExchangeRateService.TABLE_KEY, jitter(ExchangeRateService.CACHE_TTL), json).catch(() => {}),
          redis.setex(ExchangeRateService.TABLE_LAST_KEY, ExchangeRateService.LAST_TTL, json).catch(() => {}),
          redis.setex(ExchangeRateService.FETCHED_AT_KEY, ExchangeRateService.LAST_TTL, String(Date.now())).catch(() => {}),
        ])
        return table
      } catch (error) {
        const stale = await redis.get(ExchangeRateService.TABLE_LAST_KEY).catch(() => null)
        if (stale) {
          Logger.warn(`TCMB fetch failed, serving stale FX table: ${error instanceof Error ? error.message : String(error)}`)
          try { return JSON.parse(stale) as FxTable } catch { /* fall through */ }
        }
        Logger.error(`${EXCHANGE_RATE_MESSAGES.FETCH_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
        throw new AppError(EXCHANGE_RATE_MESSAGES.RATE_UNAVAILABLE, 503, ErrorCode.INTERNAL_ERROR)
      }
    })
  }

  private static parseTable(xml: string): FxTable {
    type C = { CurrencyCode?: string; Kod?: string; Unit?: string | number; ForexBuying?: string | number; ForexSelling?: string | number }
    type Doc = { Tarih_Date?: { Currency?: C | C[] } }
    let doc: Doc
    try { doc = ExchangeRateService.parser.parse(xml) as Doc } catch { throw new AppError(EXCHANGE_RATE_MESSAGES.PARSE_FAILED, 503, ErrorCode.INTERNAL_ERROR) }
    const raw = doc?.Tarih_Date?.Currency
    const list: C[] = Array.isArray(raw) ? raw : raw ? [raw] : []
    const table: FxTable = { TRY: { buying: 1, selling: 1 } }
    for (const c of list) {
      const code = c.CurrencyCode || c.Kod
      const unit = Number(c.Unit) || 1
      const buying = Number(c.ForexBuying)
      const selling = Number(c.ForexSelling)
      if (!code) continue
      // Normalise to per-1-unit (TCMB quotes some per 100, e.g. JPY).
      if (Number.isFinite(selling) && selling > 0) {
        table[code] = { buying: (Number.isFinite(buying) && buying > 0 ? buying : selling) / unit, selling: selling / unit }
      }
    }
    if (!table.USD) throw new AppError(EXCHANGE_RATE_MESSAGES.PARSE_FAILED, 503, ErrorCode.INTERNAL_ERROR)
    return table
  }

  // ── Secondary provider (fallback for non-TCMB pairs) ─────────────────────

  /** Keyless fallback (exchangerate.host) for currencies TCMB does not list. */
  private static async fallbackRate(from: string, to: string): Promise<number | null> {
    try {
      const res = await axios.get('https://api.exchangerate.host/convert', {
        params: { from, to, amount: 1 }, timeout: ExchangeRateService.FETCH_TIMEOUT_MS,
      })
      const r = Number(res.data?.result)
      return Number.isFinite(r) && r > 0 ? r : null
    } catch (err) {
      Logger.warn(`[fx] fallback provider failed for ${from}->${to}: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Multiplicative selling (ask) rate so `amountTo = amountFrom * rate`.
   * Composes through the TRY base for cross-currency pairs; falls back to the
   * secondary provider when a currency is absent from the TCMB table.
   */
  static async getRate(from: string, to: string): Promise<{ from: string; to: string; rate: number }> {
    const f = from.toUpperCase()
    const t = to.toUpperCase()
    if (f === t) return ExchangeRateQuoteSchema.parse({ from: f, to: t, rate: 1 })

    const table = await ExchangeRateService.getTable()
    const fEntry = table[f]
    const tEntry = table[t]
    let rate: number | null = null
    if (fEntry && tEntry) {
      // Cross via TRY: (TRY per 1 F) / (TRY per 1 T).
      rate = fEntry.selling / tEntry.selling
    } else {
      rate = await ExchangeRateService.fallbackRate(f, t)
    }
    if (rate === null) throw new AppError(EXCHANGE_RATE_MESSAGES.UNSUPPORTED_PAIR, 400, ErrorCode.VALIDATION_ERROR)
    return ExchangeRateQuoteSchema.parse({ from: f, to: t, rate })
  }

  /** Bid/ask/mid quote for a pair (TCMB pairs only; fallback gives a single mid). */
  static async getQuote(from: string, to: string): Promise<{ from: string; to: string; bid: number; ask: number; mid: number }> {
    const f = from.toUpperCase()
    const t = to.toUpperCase()
    if (f === t) return { from: f, to: t, bid: 1, ask: 1, mid: 1 }
    const table = await ExchangeRateService.getTable()
    const fE = table[f]
    const tE = table[t]
    if (fE && tE) {
      const ask = fE.selling / tE.selling // sell F / buy T at worst spread
      const bid = fE.buying / tE.buying
      return { from: f, to: t, bid, ask, mid: (bid + ask) / 2 }
    }
    const r = await ExchangeRateService.fallbackRate(f, t)
    if (r === null) throw new AppError(EXCHANGE_RATE_MESSAGES.UNSUPPORTED_PAIR, 400, ErrorCode.VALIDATION_ERROR)
    return { from: f, to: t, bid: r, ask: r, mid: r }
  }

  /**
   * Convert `amount` from→to with currency-aware rounding (zero-decimal aware,
   * half-up default or half-even).
   */
  static async convert(amount: number, from: string, to: string, opts: { roundingMode?: RoundingMode } = {}): Promise<number> {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new AppError(EXCHANGE_RATE_MESSAGES.INVALID_AMOUNT, 400, ErrorCode.VALIDATION_ERROR)
    }
    const { rate } = await ExchangeRateService.getRate(from, to)
    return roundAmount(amount * rate, currencyDp(to), opts.roundingMode ?? 'half-up')
  }

  /** Force a refresh of the TCMB table (cache warmup job). */
  static async refresh(): Promise<number> {
    await redis.del(ExchangeRateService.TABLE_KEY).catch(() => {})
    const table = await ExchangeRateService.getTable()
    return Object.keys(table).length
  }

  /** Rate freshness — for staleness alerting / health checks. */
  static async getStaleness(): Promise<{ fetchedAt: number | null; ageMs: number | null; stale: boolean }> {
    const raw = await redis.get(ExchangeRateService.FETCHED_AT_KEY).catch(() => null)
    const fetchedAt = raw ? Number(raw) : null
    if (!fetchedAt) return { fetchedAt: null, ageMs: null, stale: true }
    const ageMs = Date.now() - fetchedAt
    const stale = ageMs > ExchangeRateService.STALE_AFTER_MS
    if (stale) Logger.warn(`[fx] TCMB table is stale (${Math.round(ageMs / 3600000)}h old)`)
    return { fetchedAt, ageMs, stale }
  }

  /** List the currencies currently quotable from the cached TCMB table. */
  static async supportedCurrencies(): Promise<string[]> {
    const table = await ExchangeRateService.getTable()
    return Object.keys(table).sort()
  }
}
