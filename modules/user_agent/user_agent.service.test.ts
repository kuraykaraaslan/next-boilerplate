import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import UserAgentService from './user_agent.service';

const CHROME_WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FIREFOX_LINUX_UA =
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/116.0';
const SAFARI_IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
const EDGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';

describe('UserAgentService.parseUserAgent', () => {
  it('returns unknown defaults for empty string', () => {
    const result = UserAgentService.parseUserAgent('');
    expect(result.osName).toBe('Unknown');
    expect(result.browserName).toBe('Unknown');
    expect(result.deviceType).toBe('Desktop');
  });

  it('detects Windows OS and Chrome browser', () => {
    const result = UserAgentService.parseUserAgent(CHROME_WINDOWS_UA);
    expect(result.osName).toBe('Windows');
    expect(result.browserName).toBe('Chrome');
    expect(result.deviceType).toBe('Desktop');
    expect(result.osVersion).toBe('10.0');
  });

  it('detects Linux OS and Firefox browser', () => {
    const result = UserAgentService.parseUserAgent(FIREFOX_LINUX_UA);
    expect(result.osName).toBe('Linux');
    expect(result.browserName).toBe('Firefox');
    expect(result.deviceType).toBe('Desktop');
    expect(result.browserVersion).toMatch(/^116/);
  });

  it('detects iOS and Safari on iPhone and classifies as Mobile', () => {
    const result = UserAgentService.parseUserAgent(SAFARI_IPHONE_UA);
    expect(result.osName).toBe('iOS');
    expect(result.browserName).toBe('Safari');
    expect(result.deviceType).toBe('Mobile');
  });

  it('detects Edge browser over Chrome', () => {
    const result = UserAgentService.parseUserAgent(EDGE_UA);
    expect(result.browserName).toBe('Edge');
  });

  it('classifies iPad user agent as Tablet', () => {
    const result = UserAgentService.parseUserAgent(IPAD_UA);
    expect(result.deviceType).toBe('Tablet');
  });

  it('includes a deviceName in the result', () => {
    const result = UserAgentService.parseUserAgent(CHROME_WINDOWS_UA);
    expect(result.deviceName).toBeTruthy();
    expect(result.deviceName).toContain('Windows');
    expect(result.deviceName).toContain('Chrome');
  });
});

describe('UserAgentService.formatLocation', () => {
  it('returns Unknown when all geo fields are null', () => {
    const result = UserAgentService.formatLocation({
      city: null,
      state: null,
      country: null,
      countryCode: null,
      latitude: null,
      longitude: null,
    });
    expect(result).toBe('Unknown');
  });

  it('formats city, state, and country together', () => {
    const result = UserAgentService.formatLocation({
      city: 'Istanbul',
      state: 'Istanbul',
      country: 'Turkey',
      countryCode: 'TR',
      latitude: 41.0,
      longitude: 28.9,
    });
    expect(result).toBe('Istanbul, Istanbul, Turkey');
  });

  it('formats only country when city and state are null', () => {
    const result = UserAgentService.formatLocation({
      city: null,
      state: null,
      country: 'Turkey',
      countryCode: 'TR',
      latitude: null,
      longitude: null,
    });
    expect(result).toBe('Turkey');
  });
});

describe('UserAgentService.getGeoLocation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null fields for localhost IP', async () => {
    const result = await UserAgentService.getGeoLocation('127.0.0.1');
    expect(result.city).toBeNull();
    expect(result.country).toBeNull();
  });

  it('returns null fields for private 192.168.x.x IP', async () => {
    const result = await UserAgentService.getGeoLocation('192.168.1.1');
    expect(result.city).toBeNull();
    expect(result.country).toBeNull();
  });

  it('returns null fields for private 10.x.x.x IP', async () => {
    const result = await UserAgentService.getGeoLocation('10.0.0.1');
    expect(result.city).toBeNull();
    expect(result.country).toBeNull();
  });

  it('returns null fields when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network error'); }));

    const result = await UserAgentService.getGeoLocation('8.8.8.8');
    expect(result.city).toBeNull();
    expect(result.country).toBeNull();

    vi.unstubAllGlobals();
  });

  it('returns null fields when ip-api returns non-success status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'fail', message: 'invalid query' }),
    })));

    const result = await UserAgentService.getGeoLocation('8.8.8.8');
    expect(result.city).toBeNull();
    expect(result.country).toBeNull();

    vi.unstubAllGlobals();
  });

  it('returns geo data on successful ip-api response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: 'success',
        city: 'Istanbul',
        region: 'Istanbul',
        country: 'Turkey',
        countryCode: 'TR',
        lat: 41.0082,
        lon: 28.9784,
      }),
    })));

    const result = await UserAgentService.getGeoLocation('8.8.8.8');
    expect(result.city).toBe('Istanbul');
    expect(result.country).toBe('Turkey');
    expect(result.countryCode).toBe('TR');

    vi.unstubAllGlobals();
  });
});

describe('UserAgentService.getDeviceAndLocation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns deviceInfo, geoLocation, and location string', async () => {
    const result = await UserAgentService.getDeviceAndLocation(CHROME_WINDOWS_UA, '127.0.0.1');
    expect(result).toHaveProperty('deviceInfo');
    expect(result).toHaveProperty('geoLocation');
    expect(result).toHaveProperty('location');
    expect(result.deviceInfo.osName).toBe('Windows');
    expect(result.location).toBe('Unknown'); // localhost IP returns null fields
  });

  it('handles null userAgent and null IP gracefully', async () => {
    const result = await UserAgentService.getDeviceAndLocation(null, null);
    expect(result.deviceInfo.osName).toBe('Unknown');
    expect(result.location).toBe('Unknown');
  });
});
