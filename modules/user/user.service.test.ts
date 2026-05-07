import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async () => 'hashed_password'),
    compare: vi.fn(async () => true),
  },
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { getSystemDataSource } from '@/libs/typeorm';
import UserService from './user.service';
import UserMessages from './user.messages';

const now = new Date();

const USER_ID = '00000000-0000-1000-8000-000000000001';

const mockUserEntity = {
  userId: USER_ID,
  email: 'user@example.com',
  password: 'hashed_password',
  phone: null,
  userRole: 'USER',
  userStatus: 'ACTIVE',
  emailVerifiedAt: now,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

function clean(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function buildRepoMock(overrides: Record<string, any> = {}) {
  const findOne = vi.fn(async () => null);
  const find = vi.fn(async () => []);
  const count = vi.fn(async () => 0);
  const save = vi.fn(async (u: any) => ({ ...mockUserEntity, ...clean(u) }));
  const create = vi.fn((data: any) => ({ ...mockUserEntity, ...clean(data) }));
  const update = vi.fn(async () => ({ affected: 1 }));
  const del = vi.fn(async () => undefined);

  const repo = { findOne, find, count, save, create, update, delete: del, ...overrides };

  (getSystemDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });

  return repo;
}

describe('UserService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when email is missing', async () => {
    buildRepoMock();
    await expect(
      UserService.create({ email: '', password: 'securepass' })
    ).rejects.toThrow(UserMessages.INVALID_EMAIL);
  });

  it('throws when email already exists', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockUserEntity);

    await expect(
      UserService.create({ email: 'user@example.com', password: 'securepass' })
    ).rejects.toThrow(UserMessages.EMAIL_ALREADY_EXISTS);
  });

  it('throws when password is missing after email check', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(null);

    await expect(
      UserService.create({ email: 'new@example.com', password: '' })
    ).rejects.toThrow(UserMessages.INVALID_PASSWORD);
  });

  it('creates and returns a safe user without password field', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(null);

    const result = await UserService.create({ email: 'new@example.com', password: 'securepass' });

    expect(result.email).toBe('new@example.com');
    expect((result as any).password).toBeUndefined();
    expect((result as any).deletedAt).toBeUndefined();
  });

  it('stores email in lowercase', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(null);
    repo.save.mockResolvedValueOnce({ ...mockUserEntity, email: 'uppercase@example.com' });

    await UserService.create({ email: 'UPPERCASE@example.com', password: 'securepass' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'uppercase@example.com' })
    );
  });
});

describe('UserService.getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    buildRepoMock();
    await expect(UserService.getById('nonexistent-id')).rejects.toThrow(UserMessages.USER_NOT_FOUND);
  });

  it('returns safe user when found', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockUserEntity);

    const result = await UserService.getById(USER_ID);
    expect(result.userId).toBe(USER_ID);
    expect(result.email).toBe('user@example.com');
    expect((result as any).password).toBeUndefined();
  });
});

describe('UserService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated users with total count', async () => {
    const repo = buildRepoMock();
    repo.find.mockResolvedValueOnce([mockUserEntity]);
    repo.count.mockResolvedValueOnce(1);

    const result = await UserService.getAll({ page: 0, pageSize: 10 });
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
    expect((result.users[0] as any).password).toBeUndefined();
  });

  it('returns empty array when no users found', async () => {
    buildRepoMock();
    const result = await UserService.getAll({ page: 0, pageSize: 10 });
    expect(result.users).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('UserService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws USER_NOT_FOUND when userId is empty', async () => {
    buildRepoMock();
    await expect(
      UserService.update({ userId: '', data: { email: 'new@example.com' } })
    ).rejects.toThrow(UserMessages.USER_NOT_FOUND);
  });

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    buildRepoMock();
    await expect(
      UserService.update({ userId: 'no-such-user', data: { email: 'new@example.com' } })
    ).rejects.toThrow(UserMessages.USER_NOT_FOUND);
  });

  it('returns updated safe user', async () => {
    const repo = buildRepoMock();
    const updatedEntity = { ...mockUserEntity, email: 'updated@example.com' };
    repo.findOne
      .mockResolvedValueOnce(mockUserEntity)   // first findOne in update (exists check)
      .mockResolvedValueOnce(updatedEntity);   // second findOne after update

    const result = await UserService.update({
      userId: 'user-1',
      data: { email: 'updated@example.com' },
    });

    expect(result.email).toBe('updated@example.com');
    expect((result as any).password).toBeUndefined();
  });
});

describe('UserService.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    buildRepoMock();
    await expect(UserService.delete('nonexistent-id')).rejects.toThrow(UserMessages.USER_NOT_FOUND);
  });

  it('calls delete on the repository when user exists', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockUserEntity);

    await UserService.delete('user-1');
    expect(repo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});

describe('UserService.getByEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no user found', async () => {
    buildRepoMock();
    const result = await UserService.getByEmail('nobody@example.com');
    expect(result).toBeNull();
  });

  it('returns user (with password) when found', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockUserEntity);

    const result = await UserService.getByEmail('user@example.com');
    expect(result).not.toBeNull();
    expect(result!.email).toBe('user@example.com');
    expect(result!.password).toBeDefined();
  });

  it('queries by lowercase email', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockUserEntity);

    await UserService.getByEmail('USER@EXAMPLE.COM');
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'user@example.com' } })
    );
  });
});
