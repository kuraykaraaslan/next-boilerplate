import { OSName, DeviceType, BrowserName } from './user_agent.enums';
import { GeoLocation, DeviceInfo } from './user_agent.types';
import Logger from '@/modules/logger';

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

    return {
      osName: osInfo.name,
      osVersion: osInfo.version,
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      deviceType,
      deviceName,
    };
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
  static async getGeoLocation(ip: string): Promise<GeoLocation> {
    try {
      // Skip local/private IPs
      if (!ip || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
          city: null,
          state: null,
          country: null,
          countryCode: null,
          latitude: null,
          longitude: null,
        };
      }

      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`IP API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        Logger.warn(`Failed to get geo-location for IP ${ip}: ${data.message || 'Unknown error'}`);
        return {
          city: null,
          state: null,
          country: null,
          countryCode: null,
          latitude: null,
          longitude: null,
        };
      }

      return {
        city: data.city || null,
        state: data.region || null,
        country: data.country || null,
        countryCode: data.countryCode || null,
        latitude: data.lat || null,
        longitude: data.lon || null,
      };
    } catch (error) {
      Logger.error(`Error getting geo-location for IP ${ip}: ${(error as Error).message}`);
      return {
        city: null,
        state: null,
        country: null,
        countryCode: null,
        latitude: null,
        longitude: null,
      };
    }
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
