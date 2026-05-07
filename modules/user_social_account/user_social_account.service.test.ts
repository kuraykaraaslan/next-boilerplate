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
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    ping: vi.fn(),
    keys: vi.fn(async () => []),
  },
}));

vi.mock('@/libs/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import UserSocialAccountService from './user_social_account.service';
import { getSystemDataSource } from '@/libs/typeorm';
import UserSocialAccountMessages from './user_social_account.messages';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-1000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-1000-8000-000000000002';
const SOCIAL_ACCOUNT_ID = '00000000-0000-1000-8000-000000000003';
const now = new Date();

const mockAccount = {
  userSocialAccountId: SOCIAL_ACCOUNT_ID,
  userId: USER_ID,
  provider: 'google',
  providerId: 'google-123',
  accessToken: 'access-token-value',
  refreshToken: 'refresh-token-value',
  profilePicture: 'https://example.com/pic.jpg',
  createdAt: now,
  updatedAt: now,
};

// SafeUserSocialAccount omits accessToken and refreshToken
const mockSafeAccount = {
  userSocialAccountId: SOCIAL_ACCOUNT_ID,
  userId: USER_ID,
  provider: 'google',
  providerId: 'google-123',
  profilePicture: 'https://example.com/pic.jpg',
  createdAt: now,
  updatedAt: now,
};

function makeRepo(overrides: Partial<{
  findOne: any;
  find: any;
  save: any;
  create: any;
  update: any;
  delete: any;
}> = {}) {
  return {
    findOne: vi.fn(async () => mockAccount),
    find: vi.fn(async () => [mockAccount]),
    save: vi.fn(async (e: any) => ({ ...mockAccount, ...e })),
    create: vi.fn((data: any) => ({ ...mockAccount, ...data })),
    update: vi.fn(async () => ({ affected: 1 })),
    delete: vi.fn(async () => ({ affected: 1 })),
    ...overrides,
  };
}

function mockSystemDs(overrides = {}) {
  const repo = makeRepo(overrides);
  (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

// ─── getByUserId ──────────────────────────────────────────────────────────────

describe('UserSocialAccountService.getByUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when user has no linked accounts', async () => {
    const repo = mockSystemDs({ find: vi.fn(async () => []) });
    const result = await UserSocialAccountService.getByUserId(USER_ID);
    expect(result).toEqual([]);
    expect(repo.find).toHaveBeenCalledWith({ where: { userId: USER_ID } });
  });

  it('returns accounts without sensitive token fields', async () => {
    mockSystemDs();
    const result = await UserSocialAccountService.getByUserId(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(USER_ID);
    expect(result[0].provider).toBe('google');
    // Safe schema should omit tokens
    expect((result[0] as any).accessToken).toBeUndefined();
    expect((result[0] as any).refreshToken).toBeUndefined();
  });
});

// ─── getByProviderAndProviderId ───────────────────────────────────────────────

describe('UserSocialAccountService.getByProviderAndProviderId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when account is not found', async () => {
    mockSystemDs({ findOne: vi.fn(async () => null) });
    const result = await UserSocialAccountService.getByProviderAndProviderId('google', 'unknown-id');
    expect(result).toBeNull();
  });

  it('returns the safe account when found', async () => {
    mockSystemDs();
    const result = await UserSocialAccountService.getByProviderAndProviderId('google', 'google-123');
    expect(result?.userId).toBe(USER_ID);
    expect(result?.provider).toBe('google');
    expect((result as any)?.accessToken).toBeUndefined();
  });
});

// ─── link ─────────────────────────────────────────────────────────────────────

describe('UserSocialAccountService.link', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a new account when none exists', async () => {
    const repo = mockSystemDs({ findOne: vi.fn(async () => null) });
    const result = await UserSocialAccountService.link(
      USER_ID,
      'google',
      'google-456',
      'new-access',
      'new-refresh',
      'https://pic.example.com'
    );
    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(result.userId).toBe(USER_ID);
  });

  it('updates tokens when account belongs to the same user', async () => {
    const repo = mockSystemDs({ findOne: vi.fn(async () => mockAccount) });
    const updatedAccount = { ...mockAccount, accessToken: 'new-access' };
    repo.findOne = vi.fn()
      .mockResolvedValueOnce(mockAccount)      // existence check
      .mockResolvedValueOnce(updatedAccount);  // after update

    const result = await UserSocialAccountService.link(
      USER_ID,
      'google',
      'google-123',
      'new-access'
    );
    expect(repo.update).toHaveBeenCalledWith(
      { userSocialAccountId: SOCIAL_ACCOUNT_ID },
      expect.objectContaining({ accessToken: 'new-access' })
    );
    expect(result.userId).toBe(USER_ID);
  });

  it('throws ACCOUNT_ALREADY_LINKED when provider account belongs to another user', async () => {
    const accountOwnedByOther = { ...mockAccount, userId: OTHER_USER_ID };
    mockSystemDs({ findOne: vi.fn(async () => accountOwnedByOther) });

    await expect(
      UserSocialAccountService.link(USER_ID, 'google', 'google-123')
    ).rejects.toThrow(UserSocialAccountMessages.ACCOUNT_ALREADY_LINKED);
  });
});

// ─── updateTokens ─────────────────────────────────────────────────────────────

describe('UserSocialAccountService.updateTokens', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls update with new tokens', async () => {
    const repo = mockSystemDs();
    await UserSocialAccountService.updateTokens(SOCIAL_ACCOUNT_ID, 'new-access', 'new-refresh');
    expect(repo.update).toHaveBeenCalledWith(
      { userSocialAccountId: SOCIAL_ACCOUNT_ID },
      { accessToken: 'new-access', refreshToken: 'new-refresh' }
    );
  });

  it('calls update without refreshToken when not provided', async () => {
    const repo = mockSystemDs();
    await UserSocialAccountService.updateTokens(SOCIAL_ACCOUNT_ID, 'new-access');
    expect(repo.update).toHaveBeenCalledWith(
      { userSocialAccountId: SOCIAL_ACCOUNT_ID },
      { accessToken: 'new-access', refreshToken: undefined }
    );
  });
});

// ─── unlink ───────────────────────────────────────────────────────────────────

describe('UserSocialAccountService.unlink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws ACCOUNT_NOT_FOUND when account does not exist', async () => {
    mockSystemDs({ findOne: vi.fn(async () => null) });
    await expect(
      UserSocialAccountService.unlink(USER_ID, 'google')
    ).rejects.toThrow(UserSocialAccountMessages.ACCOUNT_NOT_FOUND);
  });

  it('deletes the account when found', async () => {
    const repo = mockSystemDs();
    await UserSocialAccountService.unlink(USER_ID, 'google');
    expect(repo.delete).toHaveBeenCalledWith({ userSocialAccountId: SOCIAL_ACCOUNT_ID });
  });
});

// ─── findUserIdByProvider ─────────────────────────────────────────────────────

describe('UserSocialAccountService.findUserIdByProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no account is found', async () => {
    mockSystemDs({ findOne: vi.fn(async () => null) });
    const result = await UserSocialAccountService.findUserIdByProvider('github', 'gh-999');
    expect(result).toBeNull();
  });

  it('returns the userId when account is found', async () => {
    mockSystemDs();
    const result = await UserSocialAccountService.findUserIdByProvider('google', 'google-123');
    expect(result).toBe(USER_ID);
  });

  it('works for multiple supported providers', async () => {
    mockSystemDs({ findOne: vi.fn(async () => ({ ...mockAccount, provider: 'github', providerId: 'gh-456' })) });
    const result = await UserSocialAccountService.findUserIdByProvider('github', 'gh-456');
    expect(result).toBe(USER_ID);
  });
});
