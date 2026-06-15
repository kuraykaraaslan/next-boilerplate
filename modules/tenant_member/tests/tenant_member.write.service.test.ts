import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, USER_ID, MEMBER_ID, mockMember, makeRepo, mockTenantDs } from './tenant_member.test-setup';
import TenantMemberService from '../tenant_member.service';
import TenantMemberMessages from '../tenant_member.messages';

beforeEach(() => vi.clearAllMocks());

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
    mockTenantDs(repo);

    const result = await TenantMemberService.update(MEMBER_ID, TENANT_ID, { memberRole: 'ADMIN', memberStatus: null });
    expect(result.memberRole).toBe('ADMIN');
    expect(repo.update).toHaveBeenCalled();
  });

  it('throws MEMBER_NOT_FOUND when member does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(
      TenantMemberService.update(MEMBER_ID, TENANT_ID, { memberRole: 'ADMIN', memberStatus: null })
    ).rejects.toThrow(TenantMemberMessages.MEMBER_NOT_FOUND);
  });

  it('throws CANNOT_DEMOTE_OWNER when trying to demote the last owner', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const repo = makeRepo({
      findOne: vi.fn(async () => ownerMember),
      count: vi.fn(async () => 1),
    });
    mockTenantDs(repo);

    await expect(
      TenantMemberService.update(MEMBER_ID, TENANT_ID, { memberRole: 'ADMIN', memberStatus: null })
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
    mockTenantDs(repo);

    const result = await TenantMemberService.update(MEMBER_ID, TENANT_ID, { memberRole: 'ADMIN', memberStatus: null });
    expect(result.memberRole).toBe('ADMIN');
  });
});

describe('TenantMemberService.delete', () => {
  it('soft-deletes a regular member', async () => {
    const repo = makeRepo({ count: vi.fn(async () => 1) });
    mockTenantDs(repo);

    await TenantMemberService.delete(MEMBER_ID, TENANT_ID);
    expect(repo.update).toHaveBeenCalledWith(
      { tenantMemberId: MEMBER_ID, tenantId: TENANT_ID },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });

  it('throws MEMBER_NOT_FOUND when member does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(TenantMemberService.delete(MEMBER_ID, TENANT_ID)).rejects.toThrow(
      TenantMemberMessages.MEMBER_NOT_FOUND
    );
  });

  it('throws LAST_OWNER when trying to delete the last owner', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const repo = makeRepo({
      findOne: vi.fn(async () => ownerMember),
      count: vi.fn(async () => 1),
    });
    mockTenantDs(repo);

    await expect(TenantMemberService.delete(MEMBER_ID, TENANT_ID)).rejects.toThrow(
      TenantMemberMessages.LAST_OWNER
    );
  });

  it('allows deleting an owner when there are multiple owners', async () => {
    const ownerMember = { ...mockMember, memberRole: 'OWNER' as const };
    const repo = makeRepo({
      findOne: vi.fn(async () => ownerMember),
      count: vi.fn(async () => 2),
    });
    mockTenantDs(repo);

    await TenantMemberService.delete(MEMBER_ID, TENANT_ID);
    expect(repo.update).toHaveBeenCalledWith(
      { tenantMemberId: MEMBER_ID, tenantId: TENANT_ID },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });
});
