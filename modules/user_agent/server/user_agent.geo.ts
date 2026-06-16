import { isIP } from 'net';
import { GeoLocation } from './user_agent.types';
import UserAgentGeoService from './user_agent.geo.service';

// Country → default BCP-47 locale (locale inference from geo).
const COUNTRY_LOCALE: Record<string, string> = {
  TR: 'tr-TR', US: 'en-US', GB: 'en-GB', DE: 'de-DE', FR: 'fr-FR', ES: 'es-ES', IT: 'it-IT',
  NL: 'nl-NL', BE: 'nl-BE', PT: 'pt-PT', BR: 'pt-BR', RU: 'ru-RU', JP: 'ja-JP', KR: 'ko-KR',
  CN: 'zh-CN', TW: 'zh-TW', SA: 'ar-SA', AE: 'ar-AE', IN: 'hi-IN', PL: 'pl-PL', SE: 'sv-SE',
  NO: 'nb-NO', DK: 'da-DK', FI: 'fi-FI', GR: 'el-GR', CZ: 'cs-CZ', UA: 'uk-UA', MX: 'es-MX',
};

/** Great-circle distance (km) between two lat/lon points. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Geo-location for an IP. Delegates to the configurable, cached geo provider
 * (UserAgentGeoService) with Tor/proxy flags. `tenantId` selects the tenant's
 * configured provider; omit for the default (ip-api).
 */
export async function getGeoLocation(ip: string, tenantId?: string): Promise<GeoLocation> {
  return UserAgentGeoService.lookup(ip, tenantId);
}

/** Infer a default BCP-47 locale from a geo country code. */
export function inferLocale(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return COUNTRY_LOCALE[countryCode.toUpperCase()] ?? null;
}

/** IP version helper (0 = invalid, 4, or 6). */
export function ipVersion(ip: string): 0 | 4 | 6 {
  return isIP(ip) as 0 | 4 | 6;
}

/**
 * Suspicious-login / anomaly detection comparing a prior known login context
 * to the current one: new country, impossible travel (great-circle distance
 * over elapsed time), Tor/proxy, or a new device. Pure — caller supplies the
 * prior context from history.
 */
export function detectAnomaly(
  prev: { geo?: GeoLocation | null; at?: Date | null; deviceName?: string | null } | null,
  current: { geo?: GeoLocation | null; at?: Date; deviceName?: string | null },
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const g = current.geo;
  if (g?.isTor) reasons.push('tor_exit_node');
  if (g?.isProxy) reasons.push('proxy');
  if (g?.isVpn) reasons.push('vpn');
  if (prev?.geo && g) {
    if (prev.geo.countryCode && g.countryCode && prev.geo.countryCode !== g.countryCode) {
      reasons.push('new_country');
      // Impossible travel: > 900 km/h implied speed between the two logins.
      if (prev.geo.latitude != null && prev.geo.longitude != null && g.latitude != null && g.longitude != null && prev.at && current.at) {
        const hours = Math.abs(current.at.getTime() - new Date(prev.at).getTime()) / 3_600_000;
        const km = haversineKm(prev.geo.latitude, prev.geo.longitude, g.latitude, g.longitude);
        if (hours > 0 && km / hours > 900) reasons.push('impossible_travel');
      }
    }
  }
  if (prev?.deviceName && current.deviceName && prev.deviceName !== current.deviceName) reasons.push('new_device');
  return { suspicious: reasons.length > 0, reasons };
}

/** Format location as a readable string */
export function formatLocation(geo: GeoLocation): string {
  const parts: string[] = [];

  if (geo.city) parts.push(geo.city);
  if (geo.state) parts.push(geo.state);
  if (geo.country) parts.push(geo.country);

  return parts.length > 0 ? parts.join(', ') : 'Unknown';
}
