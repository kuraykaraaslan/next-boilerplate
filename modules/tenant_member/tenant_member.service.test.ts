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

import { getSystemDataSource, tenantDataSourceFor, getDefaultTenantDataSource } from '@/modules/db';
import TenantMemberService from './tenant_member.service';
import TenantMemberMessages from './tenant_member.messages';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const MEMBER_ID = '550e8400-e29b-41d4-a716-446655440003';

const mockMember = {
  tenantMemberId: MEMBER_ID,
  tenantId: TENANT_ID,
  userId: USER_ID,
  memberRole: 'USER' as const,
  memberStatus: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockUser = {
  userId: USER_ID,
  email: 'member@example.com',
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
    findOne: vi.fn(async () => mockMember),
    find: vi.fn(async () => [mockMember]),
    count: vi.fn(async () => 1),
    create: vi.fn((data: any) => ({ ...mockMember, ...data })),
    save: vi.fn(async (entity: any) => ({ ...mockMember, ...entity })),
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

describe('TenantMemberService.getByTenantId', () => {
  it('returns members with user data enriched', async () => {
    const memberRepo = makeRepo();
    const userRepo = { find: vi.fn(async () => [mockUser]) };
    mockTenantDs(memberRepo);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    const result = await TenantMemberService.getByTenantId({
      tenantId: TENANT_ID,
      page: 1,
      pageSize: 10,
      search: null,
      memberRole: null,
      memberStatus: null,
    });
    expect(result.members).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('returns empty result when search yields no matching users', async () => {
    const userRepo = { find: vi.fn(async () => []) };
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    const result = await TenantMemberService.getByTenantId({
      tenantId: TENANT_ID,
      page: 1,
      pageSize: 10,
      search: 'nomatch@example.com',
      memberRole: null,
      memberStatus: null,
    });
    expect(result.members).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('TenantMemberService.getById', () => {
  it('returns member when found', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantMemberService.getById(MEMBER_ID);
    expect(result.tenantMemberId).toBe(MEMBER_ID);
    expect(result.tenantId).toBe(TENANT_ID);
  });

  it('throws MEMBER_NOT_FOUND when member does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantMemberService.getById(MEMBER_ID)).rejects.toThrow(
      TenantMemberMessages.MEMBER_NOT_FOUND
    );
  });
});

describe('TenantMemberService.getByTenantAndUser', () => {
  it('returns member by tenantId and userId', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: null,
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    expect(result).not.toBeNull();
    expect(result?.tenantId).toBe(TENANT_ID);
  });

  it('returns null when member not found by tenantId+userId', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    const result = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: null,
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    expect(result).toBeNull();
  });

  it('returns null when neither tenantMemberId nor tenantId+userId provided', async () => {
    const result = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: null,
      tenantId: null,
      userId: null,
    });
    expect(result).toBeNull();
  });

  it('looks up by tenantMemberId when provided', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: MEMBER_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    expect(result?.tenantMemberId).toBe(MEMBER_ID);
  });

  it('returns null when tenantMemberId found but tenantId does not match', async () => {
    const memberWithDifferentTenant = { ...mockMember, tenantId: 'different-tenant-id' };
    const repo = makeRepo({ findOne: vi.fn(async () => memberWithDifferentTenant) });
    mockDefaultDs(repo);

    const result = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: MEMBER_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    expect(result).toBeNull();
  });
});

describe('TenantMemberService.create', () => {
  it('creates and returns a new tenant member', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    const result = await TenantMemberService.create({
      tenantId: TENANT_ID,
      userId: USER_ID,
      memberRole: 'USER',
      memberStatus: 'ACTIVE',
    });
    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.userId).toBe(USER_ID);
    expect(repo.save).toHaveBeenCalled();
  });

  it('throws MEMBER_ALREADY_EXISTS when user is already a member', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    await expect(
      TenantMemberService.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        memberRole: 'USER',
        memberStatus: 'ACTIVE',
      })
    ).rejects.toThrow(TenantMemberMessages.MEMBER_ALREADY_EXISTS);
  });
});

describe('TenantMemberService.update', () => {
  it('updates the member role', async () => {
    const updatedMember = { ...mockMember, memberRole: 'ADMIN' as const };
    const repo = makeRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(updatedMember),
      count: vi.fn(async () => 2),
    });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    const result = await TenantMemberService.update(MEMBER_ID, { memberRole: 'ADMIN', memberStatus: null });
    expect(result.memberRole).toBe('ADMIN');
    expect(repo.update).toHaveBeenCalled();
  });

  it('throws MEMBER_NOT_FOUND when member does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(
      TenantMemberService.update(MEMBER_ID, { memberRole: 'ADMIN', memberStatus: null })
    ).rejects.toThrow(TenantMemberMessages.MEMBER_NOT_FOUND);
  });

  it('throws CANNOT_DEMOTE_OWNER when trying to demote the last owner', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const repo = makeRepo({
      findOne: vi.fn(async () => ownerMember),
      count: vi.fn(async () => 1),
    });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    await expect(
      TenantMemberService.update(MEMBER_ID, { memberRole: 'ADMIN', memberStatus: null })
    ).rejects.toThrow(TenantMemberMessages.CANNOT_DEMOTE_OWNER);
  });

  it('allows demotion of an owner when there are multiple owners', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const updatedMember = { ...mockMember, memberRole: 'ADMIN' as const };
    const repo = makeRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(updatedMember),
      count: vi.fn(async () => 2),
    });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    const result = await TenantMemberService.update(MEMBER_ID, { memberRole: 'ADMIN', memberStatus: null });
    expect(result.memberRole).toBe('ADMIN');
  });
});

describe('TenantMemberService.delete', () => {
  it('soft-deletes a regular member', async () => {
    const repo = makeRepo({ count: vi.fn(async () => 1) });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    await TenantMemberService.delete(MEMBER_ID);
    expect(repo.update).toHaveBeenCalledWith(
      { tenantMemberId: MEMBER_ID },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });

  it('throws MEMBER_NOT_FOUND when member does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDefaultDs(repo);

    await expect(TenantMemberService.delete(MEMBER_ID)).rejects.toThrow(
      TenantMemberMessages.MEMBER_NOT_FOUND
    );
  });

  it('throws LAST_OWNER when trying to delete the last owner', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const repo = makeRepo({
      findOne: vi.fn(async () => ownerMember),
      count: vi.fn(async () => 1),
    });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    await expect(TenantMemberService.delete(MEMBER_ID)).rejects.toThrow(
      TenantMemberMessages.LAST_OWNER
    );
  });

  it('allows deleting an owner when there are multiple owners', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const repo = makeRepo({
      findOne: vi.fn(async () => ownerMember),
      count: vi.fn(async () => 2),
    });
    mockDefaultDs(repo);
    mockTenantDs(repo);

    await TenantMemberService.delete(MEMBER_ID);
    expect(repo.update).toHaveBeenCalledWith(
      { tenantMemberId: MEMBER_ID },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });
});

describe('TenantMemberService.getUserTenants', () => {
  it('returns all active tenant memberships for a user', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantMemberService.getUserTenants(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(USER_ID);
  });

  it('returns empty array when user has no memberships', async () => {
    const repo = makeRepo({ find: vi.fn(async () => []) });
    mockDefaultDs(repo);

    const result = await TenantMemberService.getUserTenants(USER_ID);
    expect(result).toHaveLength(0);
  });
});

describe('TenantMemberService.hasRole', () => {
  it('returns true when member has OWNER role and OWNER is required', () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    expect(TenantMemberService.hasRole(ownerMember as any, 'OWNER')).toBe(true);
  });

  it('returns true when OWNER checks for ADMIN access (higher role satisfies lower)', () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    expect(TenantMemberService.hasRole(ownerMember as any, 'ADMIN')).toBe(true);
  });

  it('returns true when OWNER checks for USER access', () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    expect(TenantMemberService.hasRole(ownerMember as any, 'USER')).toBe(true);
  });

  it('returns false when USER checks for ADMIN access', () => {
    expect(TenantMemberService.hasRole(mockMember as any, 'ADMIN')).toBe(false);
  });

  it('returns false when USER checks for OWNER access', () => {
    expect(TenantMemberService.hasRole(mockMember as any, 'OWNER')).toBe(false);
  });

  it('returns true when ADMIN checks for USER access', () => {
    const adminMember = { ...mockMember, memberRole: 'ADMIN' as const };
    expect(TenantMemberService.hasRole(adminMember as any, 'USER')).toBe(true);
  });
});

describe('TenantMemberService.checkPermission', () => {
  it('returns true when member has sufficient role', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const repo = makeRepo({ findOne: vi.fn(async () => ownerMember) });
    mockTenantDs(repo);

    const result = await TenantMemberService.checkPermission(TENANT_ID, USER_ID, 'ADMIN');
    expect(result).toBe(true);
  });

  it('returns false when member does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    const result = await TenantMemberService.checkPermission(TENANT_ID, USER_ID, 'USER');
    expect(result).toBe(false);
  });

  it('returns false when member has insufficient role', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    const result = await TenantMemberService.checkPermission(TENANT_ID, USER_ID, 'OWNER');
    expect(result).toBe(false);
  });
});
