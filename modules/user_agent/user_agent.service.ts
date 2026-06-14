import { isIP } from 'net';
import { OSName, DeviceType, BrowserName } from './user_agent.enums';
import { GeoLocation, DeviceInfo } from './user_agent.types';
import UserAgentGeoService from './user_agent.geo.service';

// Common bot / crawler UA signatures (search engines, social, monitoring, AI).
const BOT_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /googlebot/i, name: 'Googlebot' },
  { re: /bingbot/i, name: 'Bingbot' },
  { re: /slurp/i, name: 'Yahoo! Slurp' },
  { re: /duckduckbot/i, name: 'DuckDuckBot' },
  { re: /baiduspider/i, name: 'Baiduspider' },
  { re: /yandex(bot|images)/i, name: 'YandexBot' },
  { re: /facebookexternalhit|facebot/i, name: 'Facebook' },
  { re: /twitterbot/i, name: 'Twitterbot' },
  { re: /linkedinbot/i, name: 'LinkedInBot' },
  { re: /whatsapp/i, name: 'WhatsApp' },
  { re: /telegrambot/i, name: 'TelegramBot' },
  { re: /slackbot/i, name: 'Slackbot' },
  { re: /discordbot/i, name: 'Discordbot' },
  { re: /(gptbot|chatgpt|claudebot|anthropic|ccbot|google-extended|perplexitybot)/i, name: 'AI Crawler' },
  { re: /(ahrefsbot|semrushbot|mj12bot|dotbot|petalbot)/i, name: 'SEO Crawler' },
  { re: /(uptimerobot|pingdom|statuscake)/i, name: 'Monitor' },
  { re: /(curl|wget|python-requests|axios|go-http-client|java\/|okhttp|headlesschrome|phantomjs)/i, name: 'Automation' },
  { re: /(bot|crawler|spider|crawl)/i, name: 'Generic Bot' },
];

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

export default class UserAgentService {
  /**
   * Get complete device and location information from request
   */
  static async getDeviceAndLocation(userAgent: string | null, ip: string | null): Promise<{
    deviceInfo: DeviceInfo;
    geoLocation: GeoLocation;
    location: string;
  }> {
    const deviceInfo = this.parseUserAgent(userAgent || '');
    const geoLocation = await this.getGeoLocation(ip || '');
    const location = this.formatLocation(geoLocation);

    return {
      deviceInfo,
      geoLocation,
      location,
    };
  }

  /**
   * Parse User-Agent string to extract device information
   */
  static parseUserAgent(userAgent: string): DeviceInfo {
    if (!userAgent) {
      return {
        osName: 'Unknown',
        osVersion: null,
        browserName: 'Unknown',
        browserVersion: null,
        deviceType: 'Desktop',
        deviceName: null,
      };
    }

    const osInfo = this.detectOS(userAgent);
    const browserInfo = this.detectBrowser(userAgent);
    const deviceType = this.detectDeviceType(userAgent);
    const deviceName = this.generateDeviceName(osInfo.name, browserInfo.name, deviceType);
    const bot = this.detectBot(userAgent);

    return {
      osName: osInfo.name,
      osVersion: osInfo.version,
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      deviceType,
      deviceName,
      isBot: bot !== null,
      botName: bot,
    };
  }

  /** Detect bot/crawler from the UA string; returns the bot name or null. */
  static detectBot(userAgent: string): string | null {
    if (!userAgent) return null;
    for (const { re, name } of BOT_PATTERNS) if (re.test(userAgent)) return name;
    return null;
  }

  /**
   * Augment device info with UA Client Hints (Sec-CH-UA* headers), which modern
   * browsers send instead of a detailed UA string. Hints win when present.
   */
  static applyClientHints(base: DeviceInfo, hints: {
    'sec-ch-ua-platform'?: string | null;
    'sec-ch-ua-mobile'?: string | null;
    'sec-ch-ua'?: string | null;
  }): DeviceInfo {
    const out = { ...base };
    const platform = hints['sec-ch-ua-platform']?.replace(/"/g, '').trim();
    if (platform) {
      const p = platform.toLowerCase();
      if (p.includes('android')) out.osName = 'Android';
      else if (p.includes('ios')) out.osName = 'iOS';
      else if (p.includes('windows')) out.osName = 'Windows';
      else if (p.includes('mac')) out.osName = 'macOS';
      else if (p.includes('linux')) out.osName = 'Linux';
    }
    if (hints['sec-ch-ua-mobile'] === '?1') out.deviceType = 'Mobile';
    const ua = hints['sec-ch-ua'];
    if (ua) {
      if (/edge/i.test(ua)) out.browserName = 'Edge';
      else if (/chrome|chromium/i.test(ua)) out.browserName = 'Chrome';
      else if (/firefox/i.test(ua)) out.browserName = 'Firefox';
    }
    return out;
  }

  /**
   * Detect operating system from user agent
   */
  private static detectOS(userAgent: string): { name: OSName; version: string | null } {
    const patterns: Array<{ pattern: RegExp; name: OSName }> = [
      { pattern: /Windows NT 10\.0/i, name: 'Windows' },
      { pattern: /Windows NT 6\.3/i, name: 'Windows' },
      { pattern: /Windows NT 6\.2/i, name: 'Windows' },
      { pattern: /Windows NT 6\.1/i, name: 'Windows' },
      { pattern: /Windows NT 6\.0/i, name: 'Windows' },
      { pattern: /Windows NT 5\.1/i, name: 'Windows' },
      { pattern: /Windows/i, name: 'Windows' },
      { pattern: /iPhone|iPad|iPod/i, name: 'iOS' },
      { pattern: /Mac OS X/i, name: 'macOS' },
      { pattern: /Android/i, name: 'Android' },
      { pattern: /CrOS/i, name: 'Chrome OS' },
      { pattern: /Linux/i, name: 'Linux' },
      { pattern: /Unix/i, name: 'Unix' },
    ];

    for (const { pattern, name } of patterns) {
      if (pattern.test(userAgent)) {
        const version = this.extractVersion(userAgent, name);
        return { name, version };
      }
    }

    return { name: 'Unknown', version: null };
  }

  /**
   * Detect browser from user agent
   */
  private static detectBrowser(userAgent: string): { name: BrowserName; version: string | null } {
    const patterns: Array<{ pattern: RegExp; name: BrowserName; versionPattern?: RegExp }> = [
      { pattern: /Postman/i, name: 'Postman' },
      { pattern: /Edg/i, name: 'Edge', versionPattern: /Edg\/([0-9.]+)/ },
      { pattern: /Chrome/i, name: 'Chrome', versionPattern: /Chrome\/([0-9.]+)/ },
      { pattern: /Firefox/i, name: 'Firefox', versionPattern: /Firefox\/([0-9.]+)/ },
      { pattern: /Safari/i, name: 'Safari', versionPattern: /Version\/([0-9.]+)/ },
      { pattern: /MSIE|Trident/i, name: 'IE', versionPattern: /(?:MSIE |rv:)([0-9.]+)/ },
      { pattern: /Opera|OPR/i, name: 'Opera', versionPattern: /(?:Opera|OPR)\/([0-9.]+)/ },
    ];

    for (const { pattern, name, versionPattern } of patterns) {
      if (pattern.test(userAgent)) {
        let version: string | null = null;
        if (versionPattern) {
          const match = userAgent.match(versionPattern);
          version = match ? match[1] : null;
        }
        return { name, version };
      }
    }

    return { name: 'Unknown', version: null };
  }

  /**
   * Detect device type from user agent
   */
  private static detectDeviceType(userAgent: string): DeviceType {
    if (/iPad/i.test(userAgent)) return 'Tablet';
    if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return 'Mobile';
    return 'Desktop';
  }

  /**
   * Extract version information from user agent
   */
  private static extractVersion(userAgent: string, osName: OSName): string | null {
    try {
      switch (osName) {
        case 'Windows': {
          const match = userAgent.match(/Windows NT ([0-9.]+)/);
          return match ? match[1] : null;
        }
        case 'macOS': {
          const match = userAgent.match(/Mac OS X ([0-9_]+)/);
          return match ? match[1].replace(/_/g, '.') : null;
        }
        case 'iOS': {
          const match = userAgent.match(/OS ([0-9_]+)/);
          return match ? match[1].replace(/_/g, '.') : null;
        }
        case 'Android': {
          const match = userAgent.match(/Android ([0-9.]+)/);
          return match ? match[1] : null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Generate a human-readable device name
   */
  private static generateDeviceName(osName: OSName, browserName: BrowserName, deviceType: DeviceType): string {
    const parts: string[] = [];
    
    if (deviceType !== 'Desktop') {
      parts.push(deviceType);
    }
    
    if (osName !== 'Unknown') {
      parts.push(osName);
    }
    
    if (browserName !== 'Unknown') {
      parts.push(browserName);
    }

    return parts.length > 0 ? parts.join(' - ') : 'Unknown Device';
  }

  /**
   * Get geo-location from IP address using ip-api.com
   * Free tier: 45 requests per minute
   */
  /**
   * Geo-location for an IP. Delegates to the configurable, cached geo provider
   * (UserAgentGeoService) with Tor/proxy flags. `tenantId` selects the tenant's
   * configured provider; omit for the default (ip-api).
   */
  static async getGeoLocation(ip: string, tenantId?: string): Promise<GeoLocation> {
    return UserAgentGeoService.lookup(ip, tenantId);
  }

  /** Infer a default BCP-47 locale from a geo country code. */
  static inferLocale(countryCode: string | null | undefined): string | null {
    if (!countryCode) return null;
    return COUNTRY_LOCALE[countryCode.toUpperCase()] ?? null;
  }

  /** IP version helper (0 = invalid, 4, or 6). */
  static ipVersion(ip: string): 0 | 4 | 6 {
    return isIP(ip) as 0 | 4 | 6;
  }

  /**
   * Suspicious-login / anomaly detection comparing a prior known login context
   * to the current one: new country, impossible travel (great-circle distance
   * over elapsed time), Tor/proxy, or a new device. Pure — caller supplies the
   * prior context from history.
   */
  static detectAnomaly(
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

  /**
   * Format location as a readable string
   */
  static formatLocation(geo: GeoLocation): string {
    const parts: string[] = [];
    
    if (geo.city) parts.push(geo.city);
    if (geo.state) parts.push(geo.state);
    if (geo.country) parts.push(geo.country);

    return parts.length > 0 ? parts.join(', ') : 'Unknown';
  }
}
