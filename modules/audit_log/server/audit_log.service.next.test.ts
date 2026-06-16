import { describe, it, expect, vi } from 'vitest';

// AuditLogNextService extends AuditLogService, whose import graph reaches the
// setting/webhook services and (transitively) the env loader. Stub env + its
// heavy deps so this lightweight header-parsing test stays self-contained.
vi.mock('@nb/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));
vi.mock('@nb/db', () => ({ tenantDataSourceFor: vi.fn(), getSystemDataSource: vi.fn() }));
vi.mock('@nb/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

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
