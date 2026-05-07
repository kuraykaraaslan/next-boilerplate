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

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { getSystemDataSource } from '@/libs/typeorm';
import UserPreferencesService from './user_preferences.service';

const mockPrefsEntity = {
  userId: 'user-1',
  theme: 'SYSTEM',
  language: 'EN',
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  newsletter: true,
  timezone: 'UTC',
  dateFormat: 'DD_MM_YYYY',
  timeFormat: 'H24',
  firstDayOfWeek: 'MON',
};

function buildRepoMock(overrides: Record<string, any> = {}) {
  const findOne = vi.fn(async () => null);
  const save = vi.fn(async (data: any) => ({ ...mockPrefsEntity, ...data }));
  const create = vi.fn((data: any) => ({ ...mockPrefsEntity, ...data }));
  const update = vi.fn(async () => ({ affected: 1 }));
  const del = vi.fn(async () => undefined);

  const repo = { findOne, save, create, update, delete: del, ...overrides };

  (getSystemDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });

  return repo;
}

describe('UserPreferencesService.getByUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no preferences found', async () => {
    buildRepoMock();
    const result = await UserPreferencesService.getByUserId('user-1');
    expect(result).toBeNull();
  });

  it('returns parsed preferences when found', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockPrefsEntity);

    const result = await UserPreferencesService.getByUserId('user-1');
    expect(result).not.toBeNull();
    expect(result!.theme).toBe('SYSTEM');
    expect(result!.language).toBe('EN');
  });
});

describe('UserPreferencesService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when preferences already exist for user', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockPrefsEntity);

    await expect(UserPreferencesService.create('user-1')).rejects.toThrow(
      'Preferences already exist for this user'
    );
  });

  it('creates preferences with defaults when no data provided', async () => {
    buildRepoMock();

    const result = await UserPreferencesService.create('user-1');
    expect(result.theme).toBeDefined();
    expect(result.language).toBe('EN');
  });

  it('merges provided data with defaults', async () => {
    const repo = buildRepoMock();
    repo.save.mockResolvedValueOnce({ ...mockPrefsEntity, theme: 'DARK', language: 'FR' });

    const result = await UserPreferencesService.create('user-1', { theme: 'DARK', language: 'FR' });
    expect(result.theme).toBe('DARK');
    expect(result.language).toBe('FR');
  });
});

describe('UserPreferencesService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when preferences not found', async () => {
    buildRepoMock();
    await expect(
      UserPreferencesService.update('user-1', { theme: 'DARK' })
    ).rejects.toThrow('Preferences not found');
  });

  it('returns updated preferences after update', async () => {
    const repo = buildRepoMock();
    const updated = { ...mockPrefsEntity, theme: 'DARK' };
    repo.findOne
      .mockResolvedValueOnce(mockPrefsEntity) // exists check
      .mockResolvedValueOnce(updated);        // post-update fetch

    const result = await UserPreferencesService.update('user-1', { theme: 'DARK' });
    expect(result.theme).toBe('DARK');
  });
});

describe('UserPreferencesService.upsert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates existing preferences when they exist', async () => {
    const repo = buildRepoMock();
    const updated = { ...mockPrefsEntity, timezone: 'Europe/Istanbul' };
    repo.findOne
      .mockResolvedValueOnce(mockPrefsEntity)
      .mockResolvedValueOnce(updated);

    const result = await UserPreferencesService.upsert('user-1', { timezone: 'Europe/Istanbul' });
    expect(result.timezone).toBe('Europe/Istanbul');
  });

  it('creates new preferences when none exist', async () => {
    buildRepoMock();

    const result = await UserPreferencesService.upsert('user-1', { theme: 'DARK' });
    expect(result).toBeDefined();
    expect(result.theme).toBeDefined();
  });
});

describe('UserPreferencesService.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when preferences not found', async () => {
    buildRepoMock();
    await expect(UserPreferencesService.delete('user-1')).rejects.toThrow('Preferences not found');
  });

  it('calls delete on repository when preferences exist', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockPrefsEntity);

    await UserPreferencesService.delete('user-1');
    expect(repo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});

describe('UserPreferencesService.getOrCreateDefault', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns existing preferences without creating new ones', async () => {
    const repo = buildRepoMock();
    repo.findOne.mockResolvedValueOnce(mockPrefsEntity);

    const result = await UserPreferencesService.getOrCreateDefault('user-1');
    expect(result.language).toBe('EN');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('creates default preferences when none exist', async () => {
    buildRepoMock();

    const result = await UserPreferencesService.getOrCreateDefault('user-1');
    expect(result).toBeDefined();
    expect(result.timezone).toBeDefined();
  });
});
