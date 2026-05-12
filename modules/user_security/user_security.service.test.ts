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
}));

vi.mock('@/modules/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { getSystemDataSource } from '@/modules/db';
import UserSecurityService from './user_security.service';

const now = new Date();

const mockSecurityEntity = {
  userId: 'user-1',
  otpMethods: [] as string[],
  otpSecret: null as string | null,
  otpBackupCodes: [] as string[],
  lastLoginAt: null as Date | null,
  lastLoginIp: null as string | null,
  lastLoginDevice: null as string | null,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
  passkeyEnabled: false,
  passkeys: [] as any[],
};

function buildRepoMock(overrides: Record<string, any> = {}) {
  const findOne = vi.fn(async () => null as typeof mockSecurityEntity | null);
  const save = vi.fn(async (data: any) => ({ ...mockSecurityEntity, ...data }));
  const create = vi.fn((data: any) => ({ ...mockSecurityEntity, ...data }));
  const update = vi.fn(async () => ({ affected: 1 }));
  const del = vi.fn(async () => undefined);

  const repo = { findOne, save, create, update, delete: del, ...overrides };

  (getSystemDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });

  return repo;
}

describe('UserSecurityService.getByUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns default security when record not found', async () => {
    // first findOne (getByUserId) → null, then createDefaultUserSecurity calls findOne again → null
    const repo = buildRepoMock();
    repo.findOne
      .mockResolvedValueOnce(null)  // getByUserId finds nothing → triggers createDefault
      .mockResolvedValueOnce(null); // createDefaultUserSecurity checks existing → null (ok to create)

    const result = await UserSecurityService.getByUserId('user-1');
    expect(result.otpMethods).toEqual([]);
    expect(result.failedLoginAttempts).toBe(0);
    expect(result.passkeyEnabled).toBe(false);
  });

  it('returns parsed security record when found', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockSecurityEntity);

    const result = await UserSecurityService.getByUserId('user-1');
    expect(result.otpMethods).toEqual([]);
    expect(result.passkeyEnabled).toBe(false);
  });
});

describe('UserSecurityService.getSafeByUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('omits otpSecret and otpBackupCodes from result', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce({
      ...mockSecurityEntity,
      otpSecret: 'TOPSECRET',
      otpBackupCodes: ['code1', 'code2'],
    });

    const result = await UserSecurityService.getSafeByUserId('user-1');
    expect((result as any).otpSecret).toBeUndefined();
    expect((result as any).otpBackupCodes).toBeUndefined();
  });

  it('creates default and returns safe record when not found', async () => {
    const repo = buildRepoMock();
    repo.findOne
      .mockResolvedValueOnce(null)  // getSafeByUserId: not found
      .mockResolvedValueOnce(null); // createDefaultUserSecurity: no existing

    const result = await UserSecurityService.getSafeByUserId('user-1');
    expect((result as any).otpSecret).toBeUndefined();
    expect(result.passkeyEnabled).toBe(false);
  });
});

describe('UserSecurityService.createDefaultUserSecurity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when security record already exists', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockSecurityEntity);

    await expect(
      UserSecurityService.createDefaultUserSecurity('user-1')
    ).rejects.toThrow('Security record already exists for this user');
  });

  it('creates security with zeroed failedLoginAttempts and empty arrays', async () => {
    buildRepoMock();

    const result = await UserSecurityService.createDefaultUserSecurity('user-1');
    expect(result.failedLoginAttempts).toBe(0);
    expect(result.otpMethods).toEqual([]);
    expect(result.otpBackupCodes).toEqual([]);
  });
});

describe('UserSecurityService.updateUserSecurity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when security record not found', async () => {
    buildRepoMock();
    await expect(
      UserSecurityService.updateUserSecurity('user-1', { passkeyEnabled: true })
    ).rejects.toThrow('Security record not found');
  });

  it('returns updated security record', async () => {
    const repo = buildRepoMock();
    const updated = { ...mockSecurityEntity, passkeyEnabled: true };
    repo.findOne
      .mockResolvedValueOnce(mockSecurityEntity)
      .mockResolvedValueOnce(updated);

    const result = await UserSecurityService.updateUserSecurity('user-1', { passkeyEnabled: true });
    expect(result.passkeyEnabled).toBe(true);
  });
});

describe('UserSecurityService.upsertUserSecurity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates when record exists', async () => {
    const repo = buildRepoMock();
    const updated = { ...mockSecurityEntity, lastLoginIp: '1.2.3.4' };
    repo.findOne
      .mockResolvedValueOnce(mockSecurityEntity)
      .mockResolvedValueOnce(updated);

    const result = await UserSecurityService.upsertUserSecurity('user-1', { lastLoginIp: '1.2.3.4' });
    expect(result.lastLoginIp).toBe('1.2.3.4');
  });

  it('creates new record when none exists', async () => {
    buildRepoMock();

    const result = await UserSecurityService.upsertUserSecurity('user-1', { passkeyEnabled: false });
    expect(result).toBeDefined();
    expect(result.failedLoginAttempts).toBe(0);
  });
});

describe('UserSecurityService.recordLoginAttempt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when security record not found', async () => {
    buildRepoMock();
    await expect(
      UserSecurityService.recordLoginAttempt('user-1', true)
    ).rejects.toThrow('Security record not found');
  });

  it('resets failedLoginAttempts and sets lastLoginAt on success', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce({ ...mockSecurityEntity, failedLoginAttempts: 3 });

    await UserSecurityService.recordLoginAttempt('user-1', true, '1.2.3.4', 'Chrome');

    expect(repo.update).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.objectContaining({
        failedLoginAttempts: 0,
        lastLoginIp: '1.2.3.4',
        lastLoginDevice: 'Chrome',
      })
    );
  });

  it('increments failedLoginAttempts on failure', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce({ ...mockSecurityEntity, failedLoginAttempts: 1 });

    await UserSecurityService.recordLoginAttempt('user-1', false);

    expect(repo.update).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.objectContaining({ failedLoginAttempts: 2 })
    );
  });

  it('sets lockedUntil after 5 failed attempts', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce({ ...mockSecurityEntity, failedLoginAttempts: 4 });

    await UserSecurityService.recordLoginAttempt('user-1', false);

    const updateCall = (repo.update.mock.calls as any[][])[0]![1];
    expect(updateCall.failedLoginAttempts).toBe(5);
    expect(updateCall.lockedUntil).toBeInstanceOf(Date);
    expect(updateCall.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not set lockedUntil before reaching 5 failed attempts', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce({ ...mockSecurityEntity, failedLoginAttempts: 2 });

    await UserSecurityService.recordLoginAttempt('user-1', false);

    const updateCall = (repo.update.mock.calls as any[][])[0]![1];
    expect(updateCall.lockedUntil).toBeUndefined();
  });
});

describe('UserSecurityService.isLocked', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false when security record not found', async () => {
    buildRepoMock();
    const result = await UserSecurityService.isLocked('user-1');
    expect(result).toBe(false);
  });

  it('returns false when lockedUntil is null', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce({ ...mockSecurityEntity, lockedUntil: null });

    const result = await UserSecurityService.isLocked('user-1');
    expect(result).toBe(false);
  });

  it('returns true when lockedUntil is in the future', async () => {
    const repo = buildRepoMock();
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    repo.findOne.mockResolvedValueOnce({ ...mockSecurityEntity, lockedUntil: futureDate });

    const result = await UserSecurityService.isLocked('user-1');
    expect(result).toBe(true);
  });

  it('returns false when lockedUntil is in the past', async () => {
    const repo = buildRepoMock();
    const pastDate = new Date(Date.now() - 10 * 60 * 1000);
    repo.findOne.mockResolvedValueOnce({ ...mockSecurityEntity, lockedUntil: pastDate });

    const result = await UserSecurityService.isLocked('user-1');
    expect(result).toBe(false);
  });
});
