import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    TENANT_WILDCARD_DOMAIN: 'app.example.com',
    TENANT_CACHE_TTL: 300,
    VERIFICATION_DOMAIN: 'verify.example.com',
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  getDefaultTenantDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: { get: vi.fn(async () => null), set: vi.fn(), del: vi.fn(), setex: vi.fn(), ping: vi.fn() },
}));
vi.mock('@/libs/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('./dns_verification.service', () => ({
  default: {
    getStoredData: vi.fn(async () => null),
    initiateVerification: vi.fn(),
    checkVerification: vi.fn(async () => false),
    deleteStoredToken: vi.fn(),
    getTxtRecordName: vi.fn((domain: string) => `_verification.${domain}`),
    getTxtRecordValue: vi.fn((token: string) => `verify=${token}`),
    getCnameRecordName: vi.fn((domain: string, token: string) => `_verify-${token}.${domain}`),
    getCnameRecordTarget: vi.fn(() => 'verify.example.com'),
  },
}));
vi.mock('@/modules/tenant_setting/tenant_setting.service', () => ({
  default: {
    getByKey: vi.fn(async () => null),
  },
}));

import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/libs/typeorm';
import redis from '@/libs/redis';
import TenantDomainService from './tenant_domain.service';
import TenantDomainMessages from './tenant_domain.messages';
import DNSVerificationService from './dns_verification.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const DOMAIN_ID = '550e8400-e29b-41d4-a716-446655440002';

const mockDomain = {
  tenantDomainId: DOMAIN_ID,
  tenantId: TENANT_ID,
  domain: 'example.com',
  isPrimary: false,
  domainStatus: 'PENDING' as const,
  verificationToken: null,
  verifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepo(overrides: Partial<{
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    findOne: vi.fn(async () => mockDomain),
    find: vi.fn(async () => [mockDomain]),
    count: vi.fn(async () => 1),
    create: vi.fn((data: any) => ({ ...mockDomain, ...data })),
    save: vi.fn(async (entity: any) => ({ ...mockDomain, ...entity })),
    update: vi.fn(async () => ({ affected: 1 })),
    delete: vi.fn(async () => ({ affected: 1 })),
    ...overrides,
  };
}

function mockDefaultDs(repo: ReturnType<typeof makeRepo>) {
  (getDefaultTenantDataSource as any).mockResolvedValue({ getRepository: () => repo });
}

function mockTenantDs(repo: ReturnType<typeof makeRepo>) {
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
}

beforeEach(() => vi.clearAllMocks());

describe('TenantDomainService.getByTenantId', () => {
  it('returns domains and total for a tenant', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantDomainService.getByTenantId({ tenantId: TENANT_ID, page: 1, pageSize: 10 });
    expect(result.domains).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.domains[0].tenantId).toBe(TENANT_ID);
  });

  it('returns empty array when no domains exist', async () => {
    const repo = makeRepo({ find: vi.fn(async () => []), count: vi.fn(async () => 0) });
    mockTenantDs(repo);

    const result = await TenantDomainService.getByTenantId({ tenantId: TENANT_ID, page: 1, pageSize: 10 });
    expect(result.domains).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('TenantDomainService.getById', () => {
  it('returns domain when found in database', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantDomainService.getById(DOMAIN_ID);
    expect(result.tenantDomainId).toBe(DOMAIN_ID);
    expect(result.domain).toBe('example.com');
  });

  it('returns cached domain when redis cache hit', async () => {
    (redis.get as any).mockResolvedValueOnce(JSON.stringify(mockDomain));

    const result = await TenantDomainService.getById(DOMAIN_ID);
    expect(result.tenantDomainId).toBe(DOMAIN_ID);
    expect(getDefaultTenantDataSource).not.toHaveBeenCalled();
  });

  it('throws DOMAIN_NOT_FOUND when domain does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantDomainService.getById(DOMAIN_ID)).rejects.toThrow(TenantDomainMessages.DOMAIN_NOT_FOUND);
  });
});

describe('TenantDomainService.getByDomain', () => {
  it('returns domain when found', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantDomainService.getByDomain('example.com');
    expect(result).not.toBeNull();
    expect(result?.domain).toBe('example.com');
  });

  it('returns null when domain not found', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    const result = await TenantDomainService.getByDomain('notfound.com');
    expect(result).toBeNull();
  });

  it('returns cached result on cache hit', async () => {
    (redis.get as any).mockResolvedValueOnce(JSON.stringify(mockDomain));

    const result = await TenantDomainService.getByDomain('example.com');
    expect(result?.domain).toBe('example.com');
    expect(getDefaultTenantDataSource).not.toHaveBeenCalled();
  });
});

describe('TenantDomainService.getPrimaryByTenantId', () => {
  it('returns primary domain for a tenant', async () => {
    const primaryDomain = { ...mockDomain, isPrimary: true };
    const repo = makeRepo({ findOne: vi.fn(async () => primaryDomain) });
    mockTenantDs(repo);

    const result = await TenantDomainService.getPrimaryByTenantId(TENANT_ID);
    expect(result).not.toBeNull();
    expect(result?.isPrimary).toBe(true);
  });

  it('returns null when no primary domain exists', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    const result = await TenantDomainService.getPrimaryByTenantId(TENANT_ID);
    expect(result).toBeNull();
  });
});

describe('TenantDomainService.create', () => {
  it('creates a new domain successfully', async () => {
    const repo = makeRepo({
      findOne: vi.fn(async () => null),
      count: vi.fn(async () => 0),
    });
    mockTenantDs(repo);

    const result = await TenantDomainService.create({ tenantId: TENANT_ID, domain: 'newdomain.com', isPrimary: false });
    expect(result.domain).toBe('newdomain.com');
    expect(repo.save).toHaveBeenCalled();
  });

  it('throws DOMAIN_ALREADY_EXISTS when domain is taken', async () => {
    const repo = makeRepo({
      findOne: vi.fn(async () => mockDomain),
    });
    mockTenantDs(repo);

    await expect(
      TenantDomainService.create({ tenantId: TENANT_ID, domain: 'example.com', isPrimary: false })
    ).rejects.toThrow(TenantDomainMessages.DOMAIN_ALREADY_EXISTS);
  });

  it('throws DOMAIN_LIMIT_EXCEEDED when limit is reached', async () => {
    const repo = makeRepo({
      findOne: vi.fn(async () => null),
      count: vi.fn(async () => 3),
    });
    mockTenantDs(repo);

    await expect(
      TenantDomainService.create({ tenantId: TENANT_ID, domain: 'another.com', isPrimary: false })
    ).rejects.toThrow(TenantDomainMessages.DOMAIN_LIMIT_EXCEEDED);
  });

  it('unsets existing primary when isPrimary is true', async () => {
    const repo = makeRepo({
      findOne: vi.fn(async () => null),
      count: vi.fn(async () => 0),
    });
    mockTenantDs(repo);

    await TenantDomainService.create({ tenantId: TENANT_ID, domain: 'primary.com', isPrimary: true });
    expect(repo.update).toHaveBeenCalledWith(
      { tenantId: TENANT_ID, isPrimary: true },
      { isPrimary: false }
    );
  });
});

describe('TenantDomainService.update', () => {
  it('updates and returns the domain', async () => {
    const updatedDomain = { ...mockDomain, isPrimary: true };
    const repo = makeRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockDomain)
        .mockResolvedValueOnce(updatedDomain),
    });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    const result = await TenantDomainService.update(DOMAIN_ID, { isPrimary: true });
    expect(result.isPrimary).toBe(true);
  });

  it('throws DOMAIN_NOT_FOUND when domain does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantDomainService.update(DOMAIN_ID, { isPrimary: true })).rejects.toThrow(
      TenantDomainMessages.DOMAIN_NOT_FOUND
    );
  });
});

describe('TenantDomainService.verifyDomain', () => {
  it('throws DOMAIN_NOT_FOUND when domain does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantDomainService.verifyDomain(DOMAIN_ID)).rejects.toThrow(
      TenantDomainMessages.DOMAIN_NOT_FOUND
    );
  });

  it('throws DOMAIN_ALREADY_VERIFIED when already verified', async () => {
    const verifiedDomain = { ...mockDomain, domainStatus: 'VERIFIED' as const };
    const repo = makeRepo({ findOne: vi.fn(async () => verifiedDomain) });
    mockDefaultDs(repo);

    await expect(TenantDomainService.verifyDomain(DOMAIN_ID)).rejects.toThrow(
      TenantDomainMessages.DOMAIN_ALREADY_VERIFIED
    );
  });

  it('throws DNS_VERIFICATION_FAILED when DNS check fails', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    mockTenantDs(repo);
    (DNSVerificationService.checkVerification as any).mockResolvedValue(false);

    await expect(TenantDomainService.verifyDomain(DOMAIN_ID)).rejects.toThrow(
      TenantDomainMessages.DNS_VERIFICATION_FAILED
    );
  });

  it('marks domain as VERIFIED when DNS check passes', async () => {
    const verifiedResult = { ...mockDomain, domainStatus: 'VERIFIED' as const, verifiedAt: new Date() };
    const repo = makeRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockDomain)
        .mockResolvedValueOnce(verifiedResult),
    });
    mockDefaultDs(repo);
    mockTenantDs(repo);
    (DNSVerificationService.checkVerification as any).mockResolvedValue(true);

    const result = await TenantDomainService.verifyDomain(DOMAIN_ID);
    expect(result.domainStatus).toBe('VERIFIED');
    expect(repo.update).toHaveBeenCalledWith(
      { tenantDomainId: DOMAIN_ID },
      expect.objectContaining({ domainStatus: 'VERIFIED' })
    );
  });
});

describe('TenantDomainService.delete', () => {
  it('deletes a non-primary domain', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    mockTenantDs(repo);
    (DNSVerificationService.deleteStoredToken as any).mockResolvedValue(undefined);

    await TenantDomainService.delete(DOMAIN_ID);
    expect(repo.delete).toHaveBeenCalledWith({ tenantDomainId: DOMAIN_ID });
  });

  it('throws DOMAIN_NOT_FOUND when domain does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantDomainService.delete(DOMAIN_ID)).rejects.toThrow(
      TenantDomainMessages.DOMAIN_NOT_FOUND
    );
  });

  it('throws CANNOT_DELETE_PRIMARY when trying to delete primary domain', async () => {
    const primaryDomain = { ...mockDomain, isPrimary: true };
    const repo = makeRepo({ findOne: vi.fn(async () => primaryDomain) });
    mockDefaultDs(repo);

    await expect(TenantDomainService.delete(DOMAIN_ID)).rejects.toThrow(
      TenantDomainMessages.CANNOT_DELETE_PRIMARY
    );
  });
});
