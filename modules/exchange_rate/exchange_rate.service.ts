import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import redis, { jitter, singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { EXCHANGE_RATE_MESSAGES } from './exchange_rate.messages'

/**
 * ExchangeRateService — live FX rates from TCMB (Türkiye Cumhuriyet Merkez Bankası).
 *
 * Used to charge Turkish cards in TRY: a plan priced in USD is converted to TRY
 * at the official TCMB selling rate at checkout time (see `tenant_subscription`'s
 * `payWithCard` / `quote`). Only the USD <-> TRY pair is supported for now.
 *
 * The TCMB rate is cached in Redis for a few hours (it publishes once per business
 * day, ~15:30 TRT). On a TCMB outage we deliberately serve the last cached value
 * rather than block a checkout — only a cold cache surfaces an error.
 */
export default class ExchangeRateService {
  private static readonly TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'
  /** Fresh cache key holding USD ForexSelling (TRY per 1 USD), short TTL. */
  private static readonly CACHE_KEY = 'fx:tcmb:usdtry'
  /** Durable "last known good" key, used only when TCMB is unreachable. */
  private static readonly LAST_KEY = 'fx:tcmb:usdtry:last'
  private static readonly CACHE_TTL = 60 * 60 * 6 // 6 hours
  private static readonly LAST_TTL = 60 * 60 * 24 * 30 // 30 days
  private static readonly FETCH_TIMEOUT_MS = 8000

  private static readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })

  private static toRate(raw: string | null): number | null {
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  /**
   * TRY per 1 USD (TCMB `ForexSelling`). Served from the fresh cache when warm;
   * otherwise refetched. On a TCMB outage, falls back to the durable last-known
   * value rather than blocking a checkout.
   */
  private static async getUsdTry(): Promise<number> {
    const fresh = ExchangeRateService.toRate(await redis.get(ExchangeRateService.CACHE_KEY).catch(() => null))
    if (fresh !== null) return fresh

    return singleFlight(ExchangeRateService.CACHE_KEY, async () => {
      try {
        const res = await axios.get(ExchangeRateService.TCMB_URL, {
          timeout: ExchangeRateService.FETCH_TIMEOUT_MS,
          responseType: 'text',
        })
        const rate = ExchangeRateService.parseUsdSelling(res.data)
        await Promise.all([
          redis.setex(ExchangeRateService.CACHE_KEY, jitter(ExchangeRateService.CACHE_TTL), String(rate)).catch(() => {}),
          redis.setex(ExchangeRateService.LAST_KEY, ExchangeRateService.LAST_TTL, String(rate)).catch(() => {}),
        ])
        return rate
      } catch (error) {
        // Prefer the last known good rate over blocking checkout when TCMB is down.
        const stale = ExchangeRateService.toRate(await redis.get(ExchangeRateService.LAST_KEY).catch(() => null))
        if (stale !== null) {
          Logger.warn(`TCMB fetch failed, using stale USD/TRY rate ${stale}: ${error instanceof Error ? error.message : String(error)}`)
          return stale
        }
        Logger.error(`${EXCHANGE_RATE_MESSAGES.FETCH_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
        throw new Error(EXCHANGE_RATE_MESSAGES.RATE_UNAVAILABLE)
      }
    })
  }

  private static parseUsdSelling(xml: string): number {
    type TcmbCurrency = { CurrencyCode?: string; Kod?: string; ForexSelling?: string | number }
    type TcmbDoc = { Tarih_Date?: { Currency?: TcmbCurrency | TcmbCurrency[] } }

    let doc: TcmbDoc
    try {
      doc = ExchangeRateService.parser.parse(xml) as TcmbDoc
    } catch {
      throw new Error(EXCHANGE_RATE_MESSAGES.PARSE_FAILED)
    }
    const currencies = doc?.Tarih_Date?.Currency
    const list: TcmbCurrency[] = Array.isArray(currencies) ? currencies : currencies ? [currencies] : []
    const usd = list.find((c) => c?.CurrencyCode === 'USD' || c?.Kod === 'USD')
    const selling = usd ? Number(usd.ForexSelling) : NaN
    if (!Number.isFinite(selling) || selling <= 0) throw new Error(EXCHANGE_RATE_MESSAGES.PARSE_FAILED)
    return selling
  }

  /**
   * Multiplicative rate so that `amountTo = amountFrom * getRate(from, to)`.
   * Supports USD <-> TRY (and identity); throws `UNSUPPORTED_PAIR` otherwise.
   */
  static async getRate(from: string, to: string): Promise<number> {
    const f = from.toUpperCase()
    const t = to.toUpperCase()
    if (f === t) return 1
    if (f === 'USD' && t === 'TRY') return ExchangeRateService.getUsdTry()
    if (f === 'TRY' && t === 'USD') return 1 / (await ExchangeRateService.getUsdTry())
    throw new Error(EXCHANGE_RATE_MESSAGES.UNSUPPORTED_PAIR)
  }

  /** Convert `amount` from one currency to another, rounded half-up to 2 decimals. */
  static async convert(amount: number, from: string, to: string): Promise<number> {
    const rate = await ExchangeRateService.getRate(from, to)
    return Math.round((amount * rate + Number.EPSILON) * 100) / 100
  }
}
