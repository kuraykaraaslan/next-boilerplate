import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TENANT_ID, USER_ID, MEMBER_ID, mockMember, mockUser,
  makeRepo, mockDefaultDs, mockTenantDs,
} from './tenant_member.test-setup';
import { getDataSource } from '@kuraykaraaslan/db';
import TenantMemberService from '../tenant_member.service';
import TenantMemberMessages from '../tenant_member.messages';

beforeEach(() => vi.clearAllMocks());

describe('TenantMemberService.getByTenantId', () => {
  it('returns members with user data enriched', async () => {
    const memberRepo = makeRepo();
    const userRepo = { find: vi.fn(async () => [mockUser]) };
    mockTenantDs(memberRepo);
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

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
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

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
    mockTenantDs(repo);

    const result = await TenantMemberService.getById(MEMBER_ID, TENANT_ID);
    expect(result.tenantMemberId).toBe(MEMBER_ID);
    expect(result.tenantId).toBe(TENANT_ID);
  });

  it('throws MEMBER_NOT_FOUND when member does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(TenantMemberService.getById(MEMBER_ID, TENANT_ID)).rejects.toThrow(
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
    mockTenantDs(repo);

    const result = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: MEMBER_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    expect(result?.tenantMemberId).toBe(MEMBER_ID);
  });

  it('returns null when tenantMemberId found but userId does not match', async () => {
    const memberWithDifferentUser = { ...mockMember, userId: 'different-user-id' };
    const repo = makeRepo({ findOne: vi.fn(async () => memberWithDifferentUser) });
    mockTenantDs(repo);

    const result = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: MEMBER_ID,
      tenantId: TENANT_ID,
      userId: USER_ID,
    });
    expect(result).toBeNull();
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
