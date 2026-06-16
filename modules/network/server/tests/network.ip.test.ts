import { describe, it, expect } from 'vitest';
import {
  ipMatchesAllowlist,
  ipInSubnet,
  normalizeIp,
  normalizeSubnet,
  isValidSubnet,
  parseSubnet,
  parseSubnetString,
} from '../network.ip';
import { SubnetSchema, SubnetListSchema } from '../network.types';

describe('ipMatchesAllowlist', () => {
  it('permits everything when the allowlist is empty', () => {
    expect(ipMatchesAllowlist('203.0.113.5', [])).toBe(true);
    expect(ipMatchesAllowlist(null, undefined)).toBe(true);
  });

  it('matches a single host expressed as a /32', () => {
    expect(ipMatchesAllowlist('192.168.1.182', ['192.168.1.182/32'])).toBe(true);
    expect(ipMatchesAllowlist('192.168.1.183', ['192.168.1.182/32'])).toBe(false);
  });

  it('matches a bare address rule (treated as /32)', () => {
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

describe('ipInSubnet', () => {
  it('checks a single IP against a single subnet', () => {
    expect(ipInSubnet('10.1.2.3', '10.0.0.0/8')).toBe(true);
    expect(ipInSubnet('10.1.2.3', '192.168.0.0/16')).toBe(false);
    expect(ipInSubnet(null, '10.0.0.0/8')).toBe(false);
  });
});

describe('parseSubnet / normalizeSubnet', () => {
  it('canonicalises a bare IPv4 host to /32', () => {
    expect(normalizeSubnet('192.168.1.182')).toBe('192.168.1.182/32');
    expect(parseSubnet('192.168.1.182')).toEqual({ subnet: '192.168.1.182/32', base: '192.168.1.182', bits: 32, version: 'v4' });
  });

  it('canonicalises a bare IPv6 host to /128', () => {
    expect(normalizeSubnet('2001:db8::1')).toBe('2001:db8::1/128');
  });

  it('keeps explicit CIDR ranges', () => {
    expect(parseSubnet('10.0.0.0/8')).toEqual({ subnet: '10.0.0.0/8', base: '10.0.0.0', bits: 8, version: 'v4' });
    expect(parseSubnet('2001:db8::/32')).toEqual({ subnet: '2001:db8::/32', base: '2001:db8::', bits: 32, version: 'v6' });
  });

  it('rejects invalid subnets', () => {
    expect(parseSubnet('not-an-ip')).toBeNull();
    expect(parseSubnet('10.0.0.0/99')).toBeNull();
    expect(parseSubnet('')).toBeNull();
    expect(isValidSubnet('10.0.0.0/8')).toBe(true);
    expect(isValidSubnet('garbage')).toBe(false);
  });
});

describe('SubnetSchema', () => {
  it('accepts and canonicalises a bare host to /32', () => {
    expect(SubnetSchema.parse('192.168.1.182')).toBe('192.168.1.182/32');
  });

  it('accepts a CIDR range unchanged', () => {
    expect(SubnetSchema.parse('10.0.0.0/8')).toBe('10.0.0.0/8');
  });

  it('rejects an invalid subnet', () => {
    expect(SubnetSchema.safeParse('not-an-ip').success).toBe(false);
  });

  it('validates a list of subnets', () => {
    expect(SubnetListSchema.parse(['192.168.1.182', '10.0.0.0/8'])).toEqual(['192.168.1.182/32', '10.0.0.0/8']);
  });
});

describe('parseSubnetString', () => {
  it('splits on commas and whitespace and trims', () => {
    expect(parseSubnetString('10.0.0.0/8, 192.168.1.182/32\n 203.0.113.0/24')).toEqual([
      '10.0.0.0/8', '192.168.1.182/32', '203.0.113.0/24',
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseSubnetString('')).toEqual([]);
    expect(parseSubnetString(null)).toEqual([]);
  });
});
