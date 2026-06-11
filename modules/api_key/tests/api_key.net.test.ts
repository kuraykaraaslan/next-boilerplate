import { describe, it, expect } from 'vitest';
import { ipMatchesAllowlist, normalizeIp, parseAllowlistString } from '../api_key.net';

describe('ipMatchesAllowlist', () => {
  it('permits everything when the allowlist is empty', () => {
    expect(ipMatchesAllowlist('203.0.113.5', [])).toBe(true);
    expect(ipMatchesAllowlist(null, undefined)).toBe(true);
  });

  it('matches an exact IPv4 address', () => {
    expect(ipMatchesAllowlist('198.51.100.7', ['198.51.100.7'])).toBe(true);
    expect(ipMatchesAllowlist('198.51.100.8', ['198.51.100.7'])).toBe(false);
  });

  it('matches inside an IPv4 CIDR block', () => {
    expect(ipMatchesAllowlist('10.1.2.3', ['10.0.0.0/8'])).toBe(true);
    expect(ipMatchesAllowlist('11.1.2.3', ['10.0.0.0/8'])).toBe(false);
    expect(ipMatchesAllowlist('192.168.1.50', ['192.168.1.0/24'])).toBe(true);
    expect(ipMatchesAllowlist('192.168.2.50', ['192.168.1.0/24'])).toBe(false);
  });

  it('fails closed for an unknown / missing source IP against a non-empty list', () => {
    expect(ipMatchesAllowlist('unknown', ['10.0.0.0/8'])).toBe(false);
    expect(ipMatchesAllowlist(null, ['10.0.0.0/8'])).toBe(false);
  });

  it('normalises IPv4-mapped IPv6 addresses', () => {
    expect(normalizeIp('::ffff:10.1.2.3')).toBe('10.1.2.3');
    expect(ipMatchesAllowlist('::ffff:10.1.2.3', ['10.0.0.0/8'])).toBe(true);
  });

  it('ignores malformed rules without throwing', () => {
    expect(ipMatchesAllowlist('10.1.2.3', ['not-an-ip', '10.0.0.0/8'])).toBe(true);
    expect(ipMatchesAllowlist('10.1.2.3', ['10.0.0.0/99'])).toBe(false);
  });
});

describe('parseAllowlistString', () => {
  it('splits on commas and whitespace and trims', () => {
    expect(parseAllowlistString('10.0.0.0/8, 198.51.100.7\n 203.0.113.0/24')).toEqual([
      '10.0.0.0/8', '198.51.100.7', '203.0.113.0/24',
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseAllowlistString('')).toEqual([]);
    expect(parseAllowlistString(null)).toEqual([]);
  });
});
