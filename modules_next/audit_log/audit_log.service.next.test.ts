import { describe, it, expect } from 'vitest';
import AuditLogNextService from './audit_log.service.next';

describe('AuditLogNextService.extractRequestContext', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = { headers: { get: (h: string) => h === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null } } as any;
    const ctx = AuditLogNextService.extractRequestContext(req);
    expect(ctx.ipAddress).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = { headers: { get: (h: string) => h === 'x-real-ip' ? '9.9.9.9' : null } } as any;
    const ctx = AuditLogNextService.extractRequestContext(req);
    expect(ctx.ipAddress).toBe('9.9.9.9');
  });

  it('returns null ipAddress when no IP headers present', () => {
    const req = { headers: { get: () => null } } as any;
    const ctx = AuditLogNextService.extractRequestContext(req);
    expect(ctx.ipAddress).toBeNull();
  });

  it('extracts user-agent header', () => {
    const req = { headers: { get: (h: string) => h === 'user-agent' ? 'TestBot/1.0' : null } } as any;
    const ctx = AuditLogNextService.extractRequestContext(req);
    expect(ctx.userAgent).toBe('TestBot/1.0');
  });
});
