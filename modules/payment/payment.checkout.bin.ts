import axios from 'axios';
import redis, { jitter } from '@/modules/redis';
import { ProviderBinInfo } from './providers/base.provider';
import { PaymentProvider } from './payment.enums';
import { CardBinInfo } from './payment.types';
import { getProvider } from './payment.checkout.registry';

const BIN_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days — BIN→country is static

function normalizeBrand(association?: string | null, scheme?: string | null): string | null {
  const a = (association || '').toUpperCase().replace(/[^A-Z]/g, '');
  const map: Record<string, string> = {
    VISA: 'VISA',
    MASTERCARD: 'MASTERCARD',
    MASTER: 'MASTERCARD',
    AMERICANEXPRESS: 'AMEX',
    AMEX: 'AMEX',
    TROY: 'TROY',
    DISCOVER: 'DISCOVER',
    JCB: 'JCB',
    UNIONPAY: 'UNIONPAY',
    MIR: 'MIR',
  };
  if (map[a]) return map[a];
  const s = (scheme || '').toUpperCase().replace(/[^A-Z]/g, '');
  return map[s] ?? (s ? s : null);
}

async function lookupBinCountry(bin: string): Promise<{ country: string | null; scheme: string | null; bank: string | null } | null> {
  const clean = bin.replace(/\D/g, '').slice(0, 8);
  if (clean.length < 6) return null;
  const cacheKey = `bin:country:${clean}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try { return JSON.parse(cached); } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  try {
    const res = await axios.get(`https://lookup.binlist.net/${clean}`, {
      timeout: 5000,
      headers: { 'Accept-Version': '3', Accept: 'application/json' },
    });
    const data = res.data || {};
    const result = {
      country: data?.country?.alpha2 ?? null,
      scheme: data?.scheme ?? null,
      bank: data?.bank?.name ?? null,
    };
    await redis.setex(cacheKey, jitter(BIN_CACHE_TTL), JSON.stringify(result)).catch(() => {});
    return result;
  } catch {
    return null;
  }
}

export async function checkBin(tenantId: string, bin: string, providerName?: PaymentProvider): Promise<CardBinInfo> {
  const clean = bin.replace(/\D/g, '').slice(0, 8);
  const provider = getProvider(providerName);

  const [providerRes, countryRes] = await Promise.allSettled([
    provider.checkBin(tenantId, clean),
    lookupBinCountry(clean),
  ]);

  const pBin: ProviderBinInfo = providerRes.status === 'fulfilled' ? providerRes.value : { supported: false };
  const country = countryRes.status === 'fulfilled' ? countryRes.value : null;

  const brand = normalizeBrand(pBin.cardAssociation, country?.scheme);
  const bankName = pBin.bankName ?? country?.bank ?? null;
  const isTurkish = country?.country === 'TR' || (pBin.supported === true && !!pBin.bankName);

  return {
    bin: clean,
    brand,
    bankName,
    cardType: pBin.cardType ?? null,
    commercial: pBin.commercial === true,
    country: country?.country ?? null,
    isTurkish,
    force3ds: pBin.commercial === true,
  };
}
