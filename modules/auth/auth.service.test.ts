import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthService from './auth.service';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    EMAIL_VERIFY_TTL_SECONDS: 86400,
    EMAIL_VERIFY_RATE_LIMIT_SECONDS: 300,
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async () => 'hashed_password'),
    compare: vi.fn(async (plain: string, _hashed: string) => plain === 'correct_password'),
  },
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../notification_mail/notification_mail.service', () => ({ default: { sendEmail: vi.fn() } }));
vi.mock('../tenant/tenant.service', () => ({ default: { provisionPersonal: vi.fn() } }));
vi.mock('../tenant_invitation/tenant_invitation.service', () => ({ default: { autoAcceptForEmail: vi.fn() } }));
vi.mock('../user/user.service', () => ({ default: { getByEmail: vi.fn(async () => null) } }));

import { getSystemDataSource } from '@/libs/typeorm';
import UserService from '../user/user.service';
import AuthMessages from './auth.messages';

const mockUser = {
  userId: 'user-1',
  email: 'user@example.com',
  password: 'hashed',
  phone: null,
  userRole: 'USER',
  userStatus: 'ACTIVE',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function mockDataSource(user: typeof mockUser | null) {
  const save = vi.fn(async (u: any) => ({ ...mockUser, ...u }));
  const findOne = vi.fn(async () => user);
  const create = vi.fn((data: any) => ({ ...mockUser, ...data }));
  const repo = { findOne, save, create };
  (getSystemDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });
  return { findOne, save, create };
}

describe('AuthService.generateToken', () => {
  it('returns a 6-digit string', () => {
    const token = AuthService.generateToken();
    expect(token).toMatch(/^\d{6}$/);
  });
});

describe('AuthService.hashPassword', () => {
  it('returns a hashed string', async () => {
    const hash = await AuthService.hashPassword('mypassword');
    expect(hash).toBe('hashed_password');
  });
});

describe('AuthService.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when user not found', async () => {
    mockDataSource(null);
    await expect(
      AuthService.login({ email: 'nobody@example.com', password: 'pass' })
    ).rejects.toThrow(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
  });

  it('throws when password is wrong', async () => {
    mockDataSource(mockUser);
    await expect(
      AuthService.login({ email: mockUser.email, password: 'wrong_password' })
    ).rejects.toThrow(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
  });

  it('returns safe user on valid credentials', async () => {
    mockDataSource(mockUser);
    const result = await AuthService.login({ email: mockUser.email, password: 'correct_password' });
    expect(result.user.email).toBe(mockUser.email);
    expect((result.user as any).password).toBeUndefined();
  });
});
