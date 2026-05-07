import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    SESSION_TTL_SECONDS: 3600,
    REFRESH_TOKEN_TTL_SECONDS: 86400,
    TENANT_CACHE_TTL: 300,
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  getDefaultTenantDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    ping: vi.fn(),
    keys: vi.fn(async () => []),
    mget: vi.fn(async () => []),
  },
}));

vi.mock('@/libs/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import TenantSessionService from './tenant_session.service';
import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/libs/typeorm';
import redis from '@/libs/redis';
import TenantAuthMessages from './tenant_session.messages';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockTenant = {
  tenantId: '00000000-0000-1000-8001-000000000001',
  name: 'Acme Corp',
  description: null,
  tenantStatus: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  domains: [],
};

const mockMember = {
  tenantMemberId: '00000000-0000-1000-8001-000000000002',
  tenantId: mockTenant.tenantId,
  userId: '00000000-0000-1000-8001-000000000003',
  memberRole: 'USER' as const,
  memberStatus: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  userId: mockMember.userId,
  email: 'user@example.com',
  phone: null,
  userRole: 'USER' as const,
  userStatus: 'ACTIVE' as const,
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Helper to wire up tenantDataSourceFor ───────────────────────────────────

function mockTenantDs(tenant: typeof mockTenant | null, member: typeof mockMember | null) {
  const tenantRepo = {
    findOne: vi.fn(async () => tenant),
  };
  const memberRepo = {
    findOne: vi.fn(async () => member),
    find: vi.fn(async () => (member ? [member] : [])),
  };
  const ds = {
    getRepository: (entity: any) => {
      const name = entity?.name ?? '';
      if (name === 'TenantMember') return memberRepo;
      return tenantRepo;
    },
  };
  (tenantDataSourceFor as any).mockResolvedValue(ds);
  (getDefaultTenantDataSource as any).mockResolvedValue(ds);
  return { tenantRepo, memberRepo };
}

// ─── hasRequiredRole ──────────────────────────────────────────────────────────

describe('TenantSessionService.hasRequiredRole', () => {
  it('OWNER satisfies any role requirement', () => {
    expect(TenantSessionService.hasRequiredRole('OWNER', 'OWNER')).toBe(true);
    expect(TenantSessionService.hasRequiredRole('OWNER', 'ADMIN')).toBe(true);
    expect(TenantSessionService.hasRequiredRole('OWNER', 'USER')).toBe(true);
  });

  it('ADMIN satisfies ADMIN and USER but not OWNER', () => {
    expect(TenantSessionService.hasRequiredRole('ADMIN', 'OWNER')).toBe(false);
    expect(TenantSessionService.hasRequiredRole('ADMIN', 'ADMIN')).toBe(true);
    expect(TenantSessionService.hasRequiredRole('ADMIN', 'USER')).toBe(true);
  });

  it('USER only satisfies USER requirement', () => {
    expect(TenantSessionService.hasRequiredRole('USER', 'OWNER')).toBe(false);
    expect(TenantSessionService.hasRequiredRole('USER', 'ADMIN')).toBe(false);
    expect(TenantSessionService.hasRequiredRole('USER', 'USER')).toBe(true);
  });
});

// ─── validateTenantStatus ─────────────────────────────────────────────────────

describe('TenantSessionService.validateTenantStatus', () => {
  it('does not throw for ACTIVE tenant', () => {
    expect(() => TenantSessionService.validateTenantStatus({ ...mockTenant, tenantStatus: 'ACTIVE' } as any)).not.toThrow();
  });

  it('throws TENANT_INACTIVE for inactive tenant', () => {
    expect(() => TenantSessionService.validateTenantStatus({ ...mockTenant, tenantStatus: 'INACTIVE' } as any))
      .toThrow(TenantAuthMessages.TENANT_INACTIVE);
  });

  it('throws TENANT_SUSPENDED for suspended tenant', () => {
    expect(() => TenantSessionService.validateTenantStatus({ ...mockTenant, tenantStatus: 'SUSPENDED' } as any))
      .toThrow(TenantAuthMessages.TENANT_SUSPENDED);
  });
});

// ─── validateMemberStatus ─────────────────────────────────────────────────────

describe('TenantSessionService.validateMemberStatus', () => {
  it('does not throw for ACTIVE member', () => {
    expect(() => TenantSessionService.validateMemberStatus({ ...mockMember, memberStatus: 'ACTIVE' } as any)).not.toThrow();
  });

  it('throws MEMBER_INACTIVE for inactive member', () => {
    expect(() => TenantSessionService.validateMemberStatus({ ...mockMember, memberStatus: 'INACTIVE' } as any))
      .toThrow(TenantAuthMessages.MEMBER_INACTIVE);
  });

  it('throws MEMBER_SUSPENDED for suspended member', () => {
    expect(() => TenantSessionService.validateMemberStatus({ ...mockMember, memberStatus: 'SUSPENDED' } as any))
      .toThrow(TenantAuthMessages.MEMBER_SUSPENDED);
  });

  it('throws MEMBER_PENDING for pending member', () => {
    expect(() => TenantSessionService.validateMemberStatus({ ...mockMember, memberStatus: 'PENDING' } as any))
      .toThrow(TenantAuthMessages.MEMBER_PENDING);
  });
});

// ─── authenticateTenantMembership ─────────────────────────────────────────────

describe('TenantSessionService.authenticateTenantMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
    (redis.setex as any).mockResolvedValue('OK');
  });

  it('throws TENANT_NOT_FOUND when tenant does not exist', async () => {
    mockTenantDs(null, null);
    await expect(
      TenantSessionService.authenticateTenantMembership({ user: mockUser as any, tenantId: mockTenant.tenantId })
    ).rejects.toThrow(TenantAuthMessages.TENANT_NOT_FOUND);
  });

  it('throws USER_NOT_MEMBER_OF_TENANT when member not found', async () => {
    mockTenantDs(mockTenant, null);
    await expect(
      TenantSessionService.authenticateTenantMembership({ user: mockUser as any, tenantId: mockTenant.tenantId })
    ).rejects.toThrow(TenantAuthMessages.USER_NOT_MEMBER_OF_TENANT);
  });

  it('throws INSUFFICIENT_TENANT_PERMISSIONS when role is insufficient', async () => {
    mockTenantDs(mockTenant, { ...mockMember, memberRole: 'USER' });
    await expect(
      TenantSessionService.authenticateTenantMembership({
        user: mockUser as any,
        tenantId: mockTenant.tenantId,
        requiredRole: 'ADMIN',
      })
    ).rejects.toThrow(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
  });

  it('returns tenant and tenantMember on happy path', async () => {
    mockTenantDs(mockTenant, mockMember);
    const result = await TenantSessionService.authenticateTenantMembership({
      user: mockUser as any,
      tenantId: mockTenant.tenantId,
    });
    expect(result.tenant.tenantId).toBe(mockTenant.tenantId);
    expect(result.tenantMember.userId).toBe(mockMember.userId);
  });

  it('returns cached result when redis cache is warm', async () => {
    const cached = JSON.stringify({ tenant: mockTenant, tenantMember: mockMember });
    (redis.get as any).mockResolvedValue(cached);
    const result = await TenantSessionService.authenticateTenantMembership({
      user: mockUser as any,
      tenantId: mockTenant.tenantId,
    });
    expect(result.tenant.tenantId).toBe(mockTenant.tenantId);
    // tenantDataSourceFor should NOT have been called
    expect(tenantDataSourceFor).not.toHaveBeenCalled();
  });

  it('throws INSUFFICIENT_TENANT_PERMISSIONS from cache when cached role is too low', async () => {
    const cached = JSON.stringify({
      tenant: mockTenant,
      tenantMember: { ...mockMember, memberRole: 'USER' },
    });
    (redis.get as any).mockResolvedValue(cached);
    await expect(
      TenantSessionService.authenticateTenantMembership({
        user: mockUser as any,
        tenantId: mockTenant.tenantId,
        requiredRole: 'OWNER',
      })
    ).rejects.toThrow(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
  });
});

// ─── clearTenantCache / clearUserTenantCaches ─────────────────────────────────

describe('TenantSessionService.clearTenantCache', () => {
  it('calls redis.del with the correct key', async () => {
    (redis.del as any).mockResolvedValue(1);
    await TenantSessionService.clearTenantCache(mockUser.userId, mockTenant.tenantId);
    expect(redis.del).toHaveBeenCalledWith(`tenant:member:${mockUser.userId}:${mockTenant.tenantId}`);
  });
});

describe('TenantSessionService.clearUserTenantCaches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing when no keys match', async () => {
    (redis.keys as any).mockResolvedValue([]);
    await TenantSessionService.clearUserTenantCaches(mockUser.userId);
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('deletes all matching keys', async () => {
    const keys = [`tenant:member:${mockUser.userId}:t1`, `tenant:member:${mockUser.userId}:t2`];
    (redis.keys as any).mockResolvedValue(keys);
    (redis.del as any).mockResolvedValue(2);
    await TenantSessionService.clearUserTenantCaches(mockUser.userId);
    expect(redis.del).toHaveBeenCalledWith(...keys);
  });
});
