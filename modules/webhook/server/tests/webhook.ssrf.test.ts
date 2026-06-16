import { describe, it, expect } from 'vitest';
import { isBlockedIp, assertSafeWebhookUrlSync, WebhookSsrfError } from '../webhook.ssrf';

describe('isBlockedIp', () => {
  it('blocks private / loopback / link-local / metadata IPv4', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0']) {
      expect(isBlockedIp(ip)).toBe(true);
    }
  });

  it('allows public IPv4', () => {
    for (const ip of ['1.1.1.1', '8.8.8.8', '93.184.216.34']) {
      expect(isBlockedIp(ip)).toBe(false);
    }
  });

  it('blocks loopback / ULA / link-local IPv6 (and mapped v4)', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isBlockedIp(ip)).toBe(true);
    }
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
  });
});

describe('assertSafeWebhookUrlSync', () => {
  it('rejects localhost and .local hosts', () => {
    expect(() => assertSafeWebhookUrlSync('http://localhost:3000/hook')).toThrow(WebhookSsrfError);
    expect(() => assertSafeWebhookUrlSync('https://printer.local/hook')).toThrow(WebhookSsrfError);
  });

  it('rejects private IP literals', () => {
    expect(() => assertSafeWebhookUrlSync('http://127.0.0.1/hook')).toThrow(WebhookSsrfError);
    expect(() => assertSafeWebhookUrlSync('http://169.254.169.254/latest/meta-data')).toThrow(WebhookSsrfError);
    expect(() => assertSafeWebhookUrlSync('http://[::1]/hook')).toThrow(WebhookSsrfError);
  });

  it('allows public domains and public IP literals', () => {
    expect(() => assertSafeWebhookUrlSync('https://example.com/hook')).not.toThrow();
    expect(() => assertSafeWebhookUrlSync('https://8.8.8.8/hook')).not.toThrow();
  });

  it('lets an explicit allowlist override a private IP literal', () => {
    expect(() => assertSafeWebhookUrlSync('http://10.0.0.5/hook', ['10.0.0.0/8'])).not.toThrow();
    expect(() => assertSafeWebhookUrlSync('http://10.0.0.5/hook', ['192.168.0.0/16'])).toThrow(WebhookSsrfError);
  });
});
