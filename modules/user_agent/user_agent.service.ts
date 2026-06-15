import { GeoLocation, DeviceInfo } from './user_agent.types';
import { parseUserAgent, detectBot, applyClientHints } from './user_agent.parse';
import { getGeoLocation, inferLocale, ipVersion, detectAnomaly, formatLocation } from './user_agent.geo';

/**
 * User-agent / geo service facade. The implementation is split into the
 * `user_agent.parse` (UA string + client hints) and `user_agent.geo`
 * (geo lookup, locale, anomaly) modules; this class preserves the single
 * `UserAgentService.*` entry point its callers depend on.
 */
export default class UserAgentService {
  /** Get complete device and location information from request */
  static async getDeviceAndLocation(userAgent: string | null, ip: string | null): Promise<{
    deviceInfo: DeviceInfo;
    geoLocation: GeoLocation;
    location: string;
  }> {
    const deviceInfo = parseUserAgent(userAgent || '');
    const geoLocation = await getGeoLocation(ip || '');
    const location = formatLocation(geoLocation);

    return { deviceInfo, geoLocation, location };
  }

  static parseUserAgent(userAgent: string): DeviceInfo {
    return parseUserAgent(userAgent);
  }

  static detectBot(userAgent: string): string | null {
    return detectBot(userAgent);
  }

  static applyClientHints(base: DeviceInfo, hints: {
    'sec-ch-ua-platform'?: string | null;
    'sec-ch-ua-mobile'?: string | null;
    'sec-ch-ua'?: string | null;
  }): DeviceInfo {
    return applyClientHints(base, hints);
  }

  static getGeoLocation(ip: string, tenantId?: string): Promise<GeoLocation> {
    return getGeoLocation(ip, tenantId);
  }

  static inferLocale(countryCode: string | null | undefined): string | null {
    return inferLocale(countryCode);
  }

  static ipVersion(ip: string): 0 | 4 | 6 {
    return ipVersion(ip);
  }

  static detectAnomaly(
    prev: { geo?: GeoLocation | null; at?: Date | null; deviceName?: string | null } | null,
    current: { geo?: GeoLocation | null; at?: Date; deviceName?: string | null },
  ): { suspicious: boolean; reasons: string[] } {
    return detectAnomaly(prev, current);
  }

  static formatLocation(geo: GeoLocation): string {
    return formatLocation(geo);
  }
}
