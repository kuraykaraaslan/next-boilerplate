import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, makeRepo, mockDefaultDs, mockTenantDs } from './tenant.test-setup';
import TenantService from '../tenant.service';
import TenantMessages from '../tenant.messages';

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
