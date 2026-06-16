import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSecurityEntity, buildRepoMock } from './user_security.test-setup';
import UserSecurityService from '../user_security.service';

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
