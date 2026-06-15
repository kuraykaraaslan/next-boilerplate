import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, USER_ID, mockMember, makeRepo, mockTenantDs } from './tenant_member.test-setup';
import TenantMemberService from '../tenant_member.service';

beforeEach(() => vi.clearAllMocks());

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
