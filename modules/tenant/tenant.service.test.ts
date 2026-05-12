import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  getDefaultTenantDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/modules/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../tenant_member/tenant_member.service', () => ({
  default: { create: vi.fn() },
}));

import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/modules/db';
import TenantService from './tenant.service';
import TenantMessages from './tenant.messages';
import TenantMemberService from '../tenant_member/tenant_member.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';

const mockTenant = {
  tenantId: TENANT_ID,
  name: 'Test Tenant',
  description: 'A test tenant',
  tenantStatus: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  domains: null,
};

function makeRepo(overrides: Partial<{
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    findOne: vi.fn(async () => mockTenant),
    find: vi.fn(async () => [mockTenant]),
    count: vi.fn(async () => 1),
    create: vi.fn((data: any) => ({ ...mockTenant, ...data })),
    save: vi.fn(async (entity: any) => ({ ...mockTenant, ...entity })),
    update: vi.fn(async () => ({ affected: 1 })),
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

describe('TenantService.getAll', () => {
  it('returns tenants and total', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantService.getAll({ page: 1, pageSize: 10, search: null, tenantId: null });
    expect(result.tenants).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.tenants[0].tenantId).toBe(TENANT_ID);
  });

  it('applies search filter when search is provided', async () => {
    const repo = makeRepo({ find: vi.fn(async () => []), count: vi.fn(async () => 0) });
    mockDefaultDs(repo);

    const result = await TenantService.getAll({ page: 1, pageSize: 10, search: 'noresult', tenantId: null });
    expect(result.tenants).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('filters by tenantId when provided', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantService.getAll({ page: 1, pageSize: 10, search: null, tenantId: TENANT_ID });
    expect(result.tenants[0].tenantId).toBe(TENANT_ID);
  });
});

describe('TenantService.getById', () => {
  it('returns tenant for valid tenantId', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantService.getById(TENANT_ID);
    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.name).toBe('Test Tenant');
  });

  it('throws TENANT_NOT_FOUND when tenant does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(TenantService.getById('nonexistent-id')).rejects.toThrow(TenantMessages.TENANT_NOT_FOUND);
  });
});

describe('TenantService.create', () => {
  it('creates and returns a new tenant', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantService.create({ name: 'New Tenant', description: null, region: 'TR' });
    expect(result.name).toBe('New Tenant');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Tenant', tenantStatus: 'ACTIVE' }));
    expect(repo.save).toHaveBeenCalled();
  });
});

describe('TenantService.update', () => {
  it('updates and returns the tenant', async () => {
    const updatedTenant = { ...mockTenant, name: 'Updated Name' };
    const repo = makeRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockTenant)
        .mockResolvedValueOnce(updatedTenant),
    });
    mockTenantDs(repo);

    const result = await TenantService.update(TENANT_ID, { name: 'Updated Name', description: null, region: null });
    expect(result.name).toBe('Updated Name');
    expect(repo.update).toHaveBeenCalled();
  });

  it('throws TENANT_NOT_FOUND when tenant does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(
      TenantService.update(TENANT_ID, { name: 'X', description: null, region: null })
    ).rejects.toThrow(TenantMessages.TENANT_NOT_FOUND);
  });
});

describe('TenantService.provisionPersonal', () => {
  it('creates tenant and adds user as OWNER', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    (TenantMemberService.create as any).mockResolvedValue({});

    const result = await TenantService.provisionPersonal('user-1', 'john@example.com');
    expect(result.tenantId).toBe(TENANT_ID);
    expect(TenantMemberService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', memberRole: 'OWNER', memberStatus: 'ACTIVE' })
    );
  });

  it('derives tenant name from email prefix', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    (TenantMemberService.create as any).mockResolvedValue({});

    await TenantService.provisionPersonal('user-1', 'alice@example.com');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'alice', tenantStatus: 'ACTIVE' })
    );
  });
});

describe('TenantService.delete', () => {
  it('soft-deletes the tenant by setting deletedAt', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    await TenantService.delete(TENANT_ID);
    expect(repo.update).toHaveBeenCalledWith(
      { tenantId: TENANT_ID },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });

  it('throws TENANT_NOT_FOUND when tenant does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(TenantService.delete(TENANT_ID)).rejects.toThrow(TenantMessages.TENANT_NOT_FOUND);
  });
});
