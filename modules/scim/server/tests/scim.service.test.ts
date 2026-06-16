import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@nb/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    NODE_ENV: 'test',
  },
}));

vi.mock('@nb/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@nb/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@nb/audit_log/server/audit_log.service', () => ({
  default: { log: vi.fn(async () => undefined) },
}));

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed') },
  hash: vi.fn(async () => 'hashed'),
}));

import ScimService from '../scim.service';
import { getDataSource, tenantDataSourceFor } from '@nb/db';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_TENANT_ID = '660e8400-e29b-41d4-a716-446655440010';
const USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const MEMBER_ID = '770e8400-e29b-41d4-a716-446655440002';

const mockUser = {
  userId: USER_ID,
  email: 'alice@example.com',
  password: 'hashed',
  userRole: 'USER',
  userStatus: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

const mockMember = {
  tenantMemberId: MEMBER_ID,
  tenantId: TENANT_ID,
  userId: USER_ID,
  memberRole: 'USER',
  memberStatus: 'ACTIVE',
  externalId: 'okta-123',
  sessionVersion: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

function makeRepo(initial: any = null) {
  let row = initial;
  const findOne = vi.fn(async () => row);
  const find = vi.fn(async () => (row ? [row] : []));
  const findAndCount = vi.fn(async () => [row ? [row] : [], row ? 1 : 0] as const);
  const create = vi.fn((data: any) => ({ ...(row ?? {}), ...data }));
  const save = vi.fn(async (entity: any) => {
    row = { ...row, ...entity };
    return row;
  });
  return { findOne, find, findAndCount, create, save, _setRow: (r: any) => { row = r; } };
}

describe('ScimService.listUsers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty list when no members exist', async () => {
    const memberRepo = makeRepo(null);
    const userRepo = makeRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    const list = await ScimService.listUsers(TENANT_ID, { startIndex: 1, count: 100 });
    expect(list.totalResults).toBe(0);
    expect(list.Resources).toEqual([]);
    expect(list.schemas[0]).toContain('ListResponse');
  });

  it('rejects an unsupported filter operator', async () => {
    const memberRepo = makeRepo(null);
    const userRepo = makeRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    await expect(
      ScimService.listUsers(TENANT_ID, { startIndex: 1, count: 100, filter: 'userName sw "ali"' }),
    ).rejects.toThrow(/filter/i);
  });
});

describe('ScimService.getUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 when member does not exist', async () => {
    const memberRepo = makeRepo(null);
    const userRepo = makeRepo(mockUser);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    await expect(ScimService.getUser(TENANT_ID, MEMBER_ID)).rejects.toThrow(/not found/i);
  });

  it('refuses cross-tenant access', async () => {
    const memberRepo = makeRepo({ ...mockMember, tenantId: OTHER_TENANT_ID });
    const userRepo = makeRepo(mockUser);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    await expect(ScimService.getUser(TENANT_ID, MEMBER_ID)).rejects.toThrow(/not found/i);
  });

  it('returns mapped SCIM user', async () => {
    const memberRepo = makeRepo(mockMember);
    const userRepo = makeRepo(mockUser);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    const u = await ScimService.getUser(TENANT_ID, MEMBER_ID);
    expect(u.userName).toBe('alice@example.com');
    expect(u.id).toBe(MEMBER_ID);
    expect(u.externalId).toBe('okta-123');
    expect(u.active).toBe(true);
    expect(u.meta.location).toContain(MEMBER_ID);
  });
});

describe('ScimService.createUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('errors on duplicate active membership', async () => {
    const memberRepo = makeRepo(mockMember);
    const userRepo = makeRepo(mockUser);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    await expect(
      ScimService.createUser(TENANT_ID, { userName: 'alice@example.com' }),
    ).rejects.toThrow(/exists/i);
  });

  it('reuses an existing User when email already known', async () => {
    const memberRepo = makeRepo(null);
    memberRepo.save = vi.fn(async (e: any) => ({ ...mockMember, ...e }));
    memberRepo.create = vi.fn((e: any) => ({ ...mockMember, ...e }));
    const userRepo = makeRepo(mockUser);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    const u = await ScimService.createUser(TENANT_ID, {
      userName: 'alice@example.com',
      externalId: 'okta-999',
      active: true,
    });
    expect(u.userName).toBe('alice@example.com');
    expect(memberRepo.create).toHaveBeenCalled();
  });
});

describe('ScimService.deleteUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft-deletes the member but keeps the user', async () => {
    const memberRepo = makeRepo({ ...mockMember });
    const userRepo = makeRepo(mockUser);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    await ScimService.deleteUser(TENANT_ID, MEMBER_ID);
    expect(memberRepo.save).toHaveBeenCalled();
    const savedArg = memberRepo.save.mock.calls[0][0];
    expect(savedArg.memberStatus).toBe('INACTIVE');
    expect(savedArg.deletedAt).toBeInstanceOf(Date);
  });
});

describe('ScimService.patchUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replaces active=false → INACTIVE', async () => {
    const memberRepo = makeRepo({ ...mockMember });
    const userRepo = makeRepo({ ...mockUser });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    const u = await ScimService.patchUser(TENANT_ID, MEMBER_ID, [
      { op: 'replace', path: 'active', value: false },
    ]);
    expect(u.active).toBe(false);
  });

  it('handles Azure AD-style path-less replace', async () => {
    const memberRepo = makeRepo({ ...mockMember });
    const userRepo = makeRepo({ ...mockUser });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    const u = await ScimService.patchUser(TENANT_ID, MEMBER_ID, [
      { op: 'replace', value: { active: false } },
    ]);
    expect(u.active).toBe(false);
  });

  it('throws invalidPath for unknown paths', async () => {
    const memberRepo = makeRepo({ ...mockMember });
    const userRepo = makeRepo({ ...mockUser });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => memberRepo });
    (getDataSource as any).mockResolvedValue({ getRepository: () => userRepo });

    await expect(
      ScimService.patchUser(TENANT_ID, MEMBER_ID, [
        { op: 'replace', path: 'name.middleInitial', value: 'X' },
      ]),
    ).rejects.toThrow(/path/i);
  });
});

describe('ScimService.listGroups', () => {
  it('returns an empty list (groups not implemented)', async () => {
    const out = await ScimService.listGroups(TENANT_ID, { startIndex: 1, count: 100 });
    expect(out.totalResults).toBe(0);
    expect(out.Resources).toEqual([]);
  });
});
