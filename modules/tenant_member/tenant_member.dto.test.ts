import { describe, it, expect } from 'vitest';
import {
  CreateTenantMemberDTO,
  UpdateTenantMemberDTO,
  GetTenantMemberDTO,
  GetTenantMembersDTO,
} from './tenant_member.dto';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

describe('CreateTenantMemberDTO', () => {
  it('accepts valid data with defaults', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID, userId: USER_ID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memberRole).toBe('USER');
      expect(result.data.memberStatus).toBe('ACTIVE');
    }
  });

  it('accepts explicit OWNER role', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID, userId: USER_ID, memberRole: 'OWNER' });
    expect(result.success).toBe(true);
  });

  it('accepts explicit ADMIN role', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID, userId: USER_ID, memberRole: 'ADMIN' });
    expect(result.success).toBe(true);
  });

  it('accepts explicit INACTIVE status', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID, userId: USER_ID, memberStatus: 'INACTIVE' });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID tenantId', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: 'not-uuid', userId: USER_ID });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID userId', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID, userId: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid memberRole', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID, userId: USER_ID, memberRole: 'SUPERADMIN' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid memberStatus', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID, userId: USER_ID, memberStatus: 'BANNED' });
    expect(result.success).toBe(false);
  });

  it('rejects missing tenantId', () => {
    const result = CreateTenantMemberDTO.safeParse({ userId: USER_ID });
    expect(result.success).toBe(false);
  });

  it('rejects missing userId', () => {
    const result = CreateTenantMemberDTO.safeParse({ tenantId: TENANT_ID });
    expect(result.success).toBe(false);
  });
});

describe('UpdateTenantMemberDTO', () => {
  it('accepts null values for both fields', () => {
    const result = UpdateTenantMemberDTO.safeParse({ memberRole: null, memberStatus: null });
    expect(result.success).toBe(true);
  });

  it('accepts valid memberRole update', () => {
    const result = UpdateTenantMemberDTO.safeParse({ memberRole: 'ADMIN', memberStatus: null });
    expect(result.success).toBe(true);
  });

  it('accepts valid memberStatus update', () => {
    const result = UpdateTenantMemberDTO.safeParse({ memberRole: null, memberStatus: 'SUSPENDED' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid memberRole', () => {
    const result = UpdateTenantMemberDTO.safeParse({ memberRole: 'GOD', memberStatus: null });
    expect(result.success).toBe(false);
  });

  it('rejects invalid memberStatus', () => {
    const result = UpdateTenantMemberDTO.safeParse({ memberRole: null, memberStatus: 'BANNED' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid memberRole values', () => {
    for (const role of ['OWNER', 'ADMIN', 'USER']) {
      expect(UpdateTenantMemberDTO.safeParse({ memberRole: role, memberStatus: null }).success).toBe(true);
    }
  });

  it('accepts all valid memberStatus values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']) {
      expect(UpdateTenantMemberDTO.safeParse({ memberRole: null, memberStatus: status }).success).toBe(true);
    }
  });
});

describe('GetTenantMemberDTO', () => {
  it('accepts tenantMemberId alone', () => {
    const result = GetTenantMemberDTO.safeParse({ tenantMemberId: VALID_UUID, tenantId: null, userId: null });
    expect(result.success).toBe(true);
  });

  it('accepts tenantId + userId combination', () => {
    const result = GetTenantMemberDTO.safeParse({ tenantMemberId: null, tenantId: TENANT_ID, userId: USER_ID });
    expect(result.success).toBe(true);
  });

  it('rejects when all fields are null (refinement fails)', () => {
    const result = GetTenantMemberDTO.safeParse({ tenantMemberId: null, tenantId: null, userId: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/tenantMemberId|tenantId.*userId/i);
    }
  });

  it('rejects non-UUID tenantMemberId', () => {
    const result = GetTenantMemberDTO.safeParse({ tenantMemberId: 'not-uuid', tenantId: null, userId: null });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID tenantId', () => {
    const result = GetTenantMemberDTO.safeParse({ tenantMemberId: null, tenantId: 'bad', userId: USER_ID });
    expect(result.success).toBe(false);
  });
});

describe('GetTenantMembersDTO', () => {
  it('accepts valid tenantId with defaults', () => {
    const result = GetTenantMembersDTO.safeParse({ tenantId: TENANT_ID, search: null, memberRole: null, memberStatus: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('accepts search string', () => {
    const result = GetTenantMembersDTO.safeParse({ tenantId: TENANT_ID, search: 'john', memberRole: null, memberStatus: null });
    expect(result.success).toBe(true);
  });

  it('accepts memberRole filter', () => {
    const result = GetTenantMembersDTO.safeParse({ tenantId: TENANT_ID, search: null, memberRole: 'ADMIN', memberStatus: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.memberRole).toBe('ADMIN');
  });

  it('accepts memberStatus filter', () => {
    const result = GetTenantMembersDTO.safeParse({ tenantId: TENANT_ID, search: null, memberRole: null, memberStatus: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID tenantId', () => {
    const result = GetTenantMembersDTO.safeParse({ tenantId: 'bad', search: null, memberRole: null, memberStatus: null });
    expect(result.success).toBe(false);
  });

  it('rejects missing tenantId', () => {
    const result = GetTenantMembersDTO.safeParse({ search: null, memberRole: null, memberStatus: null });
    expect(result.success).toBe(false);
  });

  it('rejects invalid memberRole', () => {
    const result = GetTenantMembersDTO.safeParse({ tenantId: TENANT_ID, search: null, memberRole: 'MODERATOR', memberStatus: null });
    expect(result.success).toBe(false);
  });
});
