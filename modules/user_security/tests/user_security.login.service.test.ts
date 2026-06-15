import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSecurityEntity, buildRepoMock } from './user_security.test-setup';
import UserSecurityService from '../user_security.service';

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
