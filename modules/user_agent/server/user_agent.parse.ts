import { OSName, DeviceType, BrowserName } from './user_agent.enums';
import { DeviceInfo } from './user_agent.types';

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

/** Parse User-Agent string to extract device information */
export function parseUserAgent(userAgent: string): DeviceInfo {
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

  const osInfo = detectOS(userAgent);
  const browserInfo = detectBrowser(userAgent);
  const deviceType = detectDeviceType(userAgent);
  const deviceName = generateDeviceName(osInfo.name, browserInfo.name, deviceType);
  const bot = detectBot(userAgent);

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
export function detectBot(userAgent: string): string | null {
  if (!userAgent) return null;
  for (const { re, name } of BOT_PATTERNS) if (re.test(userAgent)) return name;
  return null;
}

/**
 * Augment device info with UA Client Hints (Sec-CH-UA* headers), which modern
 * browsers send instead of a detailed UA string. Hints win when present.
 */
export function applyClientHints(base: DeviceInfo, hints: {
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

/** Detect operating system from user agent */
function detectOS(userAgent: string): { name: OSName; version: string | null } {
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
      const version = extractVersion(userAgent, name);
      return { name, version };
    }
  }

  return { name: 'Unknown', version: null };
}

/** Detect browser from user agent */
function detectBrowser(userAgent: string): { name: BrowserName; version: string | null } {
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

/** Detect device type from user agent */
function detectDeviceType(userAgent: string): DeviceType {
  if (/iPad/i.test(userAgent)) return 'Tablet';
  if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return 'Mobile';
  return 'Desktop';
}

/** Extract version information from user agent */
function extractVersion(userAgent: string, osName: OSName): string | null {
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

/** Generate a human-readable device name */
function generateDeviceName(osName: OSName, browserName: BrowserName, deviceType: DeviceType): string {
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
