import { isIP } from 'net';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import SettingService from '@/modules/setting/setting.service';
import { GeoLocation, GeoLocationSchema } from './user_agent.types';

const NULL_GEO: GeoLocation = { city: null, state: null, country: null, countryCode: null, latitude: null, longitude: null };
const GEO_CACHE_TTL = 60 * 60 * 24;       // 24h per-IP geo cache
const TOR_LIST_TTL = 60 * 60 * 6;         // refresh Tor exit list every 6h
const TOR_SET_KEY = 'geoip:tor:exitnodes';

export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('::1') || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (ip.startsWith('169.254.')) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) return true;
  return false;
}

/**
 * Geo-IP resolution with a configurable provider (ip-api / ipinfo /
 * ipgeolocation), Redis caching, and privacy-network detection (proxy/hosting
 * from the provider + real Tor-exit-node list matching). No mock: providers are
 * real public APIs gated on per-tenant config; Tor detection uses the public
 * Tor bulk exit list.
 */
export default class UserAgentGeoService {

  private static async config(tenantId?: string) {
    if (!tenantId) return { provider: 'ip-api', apiKey: null as string | null };
    const s = await SettingService.getByKeys(tenantId, ['geoIpProvider', 'geoIpApiKey']).catch(() => ({} as Record<string, string | null>));
    return { provider: (s.geoIpProvider || 'ip-api').toLowerCase(), apiKey: s.geoIpApiKey ?? null };
  }

  /** Resolve geo-location for an IP with caching + Tor/proxy flags. */
  static async lookup(ip: string, tenantId?: string): Promise<GeoLocation> {
    if (!isIP(ip) || isPrivateOrReservedIp(ip)) return NULL_GEO;

    const cacheKey = `geoip:${ip}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) { const p = GeoLocationSchema.safeParse(JSON.parse(cached)); if (p.success) return p.data; }
    } catch { /* ignore cache errors */ }

    const { provider, apiKey } = await this.config(tenantId);
    let geo = NULL_GEO;
    try {
      geo = provider === 'ipinfo' ? await this.viaIpinfo(ip, apiKey)
          : provider === 'ipgeolocation' ? await this.viaIpgeolocation(ip, apiKey)
          : await this.viaIpApi(ip);
    } catch (e) {
      Logger.warn(`[user_agent] geo lookup failed (${provider}): ${e instanceof Error ? e.message : e}`);
      geo = NULL_GEO;
    }

    // Tor exit-node detection from the real public list (best-effort).
    try { if (await this.isTorExit(ip)) geo = { ...geo, isTor: true }; } catch { /* ignore */ }

    try { await redis.setex(cacheKey, GEO_CACHE_TTL, JSON.stringify(geo)); } catch { /* ignore */ }
    return geo;
  }

  private static async viaIpApi(ip: string): Promise<GeoLocation> {
    const res = await fetch(`https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,city,lat,lon,proxy,hosting`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return NULL_GEO;
    const raw = await res.json();
    if (raw.status !== 'success') return NULL_GEO;
    return GeoLocationSchema.parse({
      city: raw.city || null, state: raw.region || null, country: raw.country || null, countryCode: raw.countryCode || null,
      latitude: raw.lat ?? null, longitude: raw.lon ?? null,
      isProxy: Boolean(raw.proxy), isHosting: Boolean(raw.hosting),
    });
  }

  private static async viaIpinfo(ip: string, apiKey: string | null): Promise<GeoLocation> {
    const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json${apiKey ? `?token=${apiKey}` : ''}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return NULL_GEO;
    const raw = await res.json();
    const [lat, lon] = (raw.loc || ',').split(',');
    return GeoLocationSchema.parse({
      city: raw.city || null, state: raw.region || null, country: raw.country || null, countryCode: raw.country || null,
      latitude: lat ? Number(lat) : null, longitude: lon ? Number(lon) : null,
      isProxy: Boolean(raw.privacy?.proxy), isHosting: Boolean(raw.privacy?.hosting), isVpn: Boolean(raw.privacy?.vpn), isTor: Boolean(raw.privacy?.tor),
    });
  }

  private static async viaIpgeolocation(ip: string, apiKey: string | null): Promise<GeoLocation> {
    if (!apiKey) return NULL_GEO;
    const res = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${encodeURIComponent(ip)}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return NULL_GEO;
    const raw = await res.json();
    return GeoLocationSchema.parse({
      city: raw.city || null, state: raw.state_prov || null, country: raw.country_name || null, countryCode: raw.country_code2 || null,
      latitude: raw.latitude ? Number(raw.latitude) : null, longitude: raw.longitude ? Number(raw.longitude) : null,
    });
  }

  /** Match an IP against the cached public Tor exit-node list (refreshed 6h). */
  static async isTorExit(ip: string): Promise<boolean> {
    try {
      const exists = await redis.exists(TOR_SET_KEY);
      if (!exists) await this.refreshTorList();
      return (await redis.sismember(TOR_SET_KEY, ip)) === 1;
    } catch { return false; }
  }

  /** Fetch + cache the public Tor bulk exit list into a Redis set. */
  static async refreshTorList(): Promise<number> {
    try {
      const res = await fetch('https://check.torproject.org/torbulkexitlist', { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return 0;
      const text = await res.text();
      const ips = text.split('\n').map((l) => l.trim()).filter((l) => l && isIP(l) > 0);
      if (ips.length === 0) return 0;
      const pipe = redis.pipeline();
      pipe.del(TOR_SET_KEY);
      // chunk to keep the command size sane
      for (let i = 0; i < ips.length; i += 1000) pipe.sadd(TOR_SET_KEY, ...ips.slice(i, i + 1000));
      pipe.expire(TOR_SET_KEY, TOR_LIST_TTL);
      await pipe.exec();
      return ips.length;
    } catch (e) {
      Logger.warn(`[user_agent] Tor list refresh failed: ${e instanceof Error ? e.message : e}`);
      return 0;
    }
  }
}
