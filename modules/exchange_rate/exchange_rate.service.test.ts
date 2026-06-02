import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const store = new Map<string, string>()
vi.mock('@/modules/redis', () => ({
  default: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    setex: vi.fn(async (k: string, _ttl: number, v: string) => { store.set(k, v); return 'OK' }),
    del: vi.fn(async (k: string) => { store.delete(k); return 1 }),
  },
  jitter: (n: number) => n,
  singleFlight: async (_k: string, fn: () => Promise<unknown>) => fn(),
}))

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

import axios from 'axios'
import ExchangeRateService from './exchange_rate.service'

const TCMB_XML = `<?xml version="1.0" encoding="ISO-8859-9"?>
<Tarih_Date Tarih="01.06.2026" Date="06/01/2026">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Unit>1</Unit>
    <Isim>ABD DOLARI</Isim>
    <ForexBuying>32.1234</ForexBuying>
    <ForexSelling>32.2567</ForexSelling>
  </Currency>
  <Currency CrossOrder="1" Kod="EUR" CurrencyCode="EUR">
    <Unit>1</Unit>
    <ForexSelling>35.0000</ForexSelling>
  </Currency>
</Tarih_Date>`

describe('ExchangeRateService', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: TCMB_XML })
  })

  it('parses USD ForexSelling for USD->TRY', async () => {
    expect(await ExchangeRateService.getRate('USD', 'TRY')).toBe(32.2567)
  })

  it('inverts the rate for TRY->USD', async () => {
    expect(await ExchangeRateService.getRate('TRY', 'USD')).toBeCloseTo(1 / 32.2567, 6)
  })

  it('returns 1 for identity pairs without hitting TCMB', async () => {
    expect(await ExchangeRateService.getRate('USD', 'USD')).toBe(1)
    expect(await ExchangeRateService.getRate('TRY', 'TRY')).toBe(1)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('converts and rounds half-up to 2 decimals', async () => {
    expect(await ExchangeRateService.convert(29, 'USD', 'TRY')).toBe(935.44)
  })

  it('caches the rate so a second lookup does not re-fetch', async () => {
    await ExchangeRateService.getRate('USD', 'TRY')
    await ExchangeRateService.getRate('USD', 'TRY')
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('serves the last known good rate when TCMB is unreachable', async () => {
    // Warm both the fresh + durable caches.
    await ExchangeRateService.getRate('USD', 'TRY')
    // Simulate the fresh (6h) key expiring while the durable key survives.
    store.delete('fx:tcmb:usdtry')
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('ETIMEDOUT'))

    expect(await ExchangeRateService.getRate('USD', 'TRY')).toBe(32.2567)
  })

  it('throws when TCMB fails with a cold cache', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('ETIMEDOUT'))
    await expect(ExchangeRateService.getRate('USD', 'TRY')).rejects.toThrow()
  })

  it('rejects unsupported currency pairs', async () => {
    await expect(ExchangeRateService.getRate('EUR', 'TRY')).rejects.toThrow()
  })
})
