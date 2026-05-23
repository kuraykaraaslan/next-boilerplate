import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    NODE_ENV: 'test',
    VERIFICATION_DOMAIN: 'verify.example.com',
  },
}));

vi.mock('@/modules/db', () => ({
  getDefaultTenantDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@/modules/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async () => []),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
  },
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));

vi.mock('@/modules/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/modules/audit_log/audit_log.service', () => ({
  default: { log: vi.fn(async () => undefined) },
}));

import { getDefaultTenantDataSource, tenantDataSourceFor } from '@/modules/db';
import DNSVerificationService from './dns_verification.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
const auditLogMock = AuditLogService.log as ReturnType<typeof vi.fn>;

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeDomain(overrides: Partial<{ tenantDomainId: string; tenantId: string; domain: string }>) {
  return {
    tenantDomainId: '11111111-1111-1111-1111-111111111111',
    tenantId: TENANT_ID,
    domain: 'good.example.com',
    isPrimary: false,
    domainStatus: 'ACTIVE' as const,
    verificationToken: null,
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DNSVerificationService.recheckActiveDomains', () => {
  it('downgrades domains whose DNS no longer resolves and audits them', async () => {
    const good = makeDomain({ tenantDomainId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', domain: 'good.example.com' });
    const broken = makeDomain({ tenantDomainId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', domain: 'broken.example.com' });

    const defaultRepo = { find: vi.fn(async () => [good, broken]) };
    (getDefaultTenantDataSource as any).mockResolvedValue({ getRepository: () => defaultRepo });

    const updateSpy = vi.fn(async () => ({ affected: 1 }));
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => ({ update: updateSpy }) });

    vi.spyOn(DNSVerificationService, 'lookupTxtRecords').mockImplementation(async (domain: string) => {
      return domain === 'good.example.com' ? ['verify=abc'] : [];
    });
    vi.spyOn(DNSVerificationService, 'lookupCnameRecord').mockResolvedValue(null);

    const result = await DNSVerificationService.recheckActiveDomains();

    expect(result).toEqual({ checked: 2, downgraded: 1 });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      { tenantDomainId: broken.tenantDomainId },
      expect.objectContaining({ domainStatus: 'DNS_FAILED' }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'domain.dns_check_failed',
        resourceId: broken.tenantDomainId,
        actorType: 'SYSTEM',
      }),
    );
  });

  it('returns zeros when no ACTIVE domains exist', async () => {
    const defaultRepo = { find: vi.fn(async () => []) };
    (getDefaultTenantDataSource as any).mockResolvedValue({ getRepository: () => defaultRepo });

    const result = await DNSVerificationService.recheckActiveDomains();
    expect(result).toEqual({ checked: 0, downgraded: 0 });
    expect(auditLogMock).not.toHaveBeenCalled();
  });
});
