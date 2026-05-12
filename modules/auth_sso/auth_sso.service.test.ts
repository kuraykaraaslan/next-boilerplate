import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '587',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'test',
    APPLICATION_HOST: 'http://localhost:3000',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    GITHUB_CLIENT_ID: 'github-client-id',
    GITHUB_CLIENT_SECRET: 'github-secret',
    SSO_ALLOWED_PROVIDERS: 'google,github',
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/modules/redis', () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() },
}));

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

// Mock SSO config
vi.mock('./auth_sso.config', () => ({
  isProviderConfigured: vi.fn((provider: string) => ['google', 'github'].includes(provider)),
  getAllowedProviders: vi.fn(() => ['google', 'github']),
  getCallbackUrl: vi.fn((provider: string) => `http://localhost:3000/api/auth/callback/${provider}`),
  SSO_CONFIGS: {
    google: { clientId: 'google-client-id', clientSecret: 'google-secret', callbackPath: '/api/auth/callback/google', authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', scopes: ['profile', 'email'] },
    github: { clientId: 'github-client-id', clientSecret: 'github-secret', callbackPath: '/api/auth/callback/github', authUrl: 'https://github.com/login/oauth/authorize', tokenUrl: 'https://github.com/login/oauth/access_token', scopes: ['user'] },
  },
}));

// Mock provider instances
const mockProviderInstance = {
  generateAuthUrl: vi.fn(() => 'https://provider.example.com/auth?client_id=test'),
  getTokens: vi.fn(async () => ({ accessToken: 'access-token-123', refreshToken: 'refresh-token-456' })),
  getUserInfo: vi.fn(async () => ({
    sub: 'provider-user-id',
    email: 'sso@example.com' as string | null,
    name: 'SSO User' as string | null,
    picture: null,
    provider: 'google',
  })),
};

vi.mock('./providers', () => ({
  getProvider: vi.fn(() => mockProviderInstance),
}));

vi.mock('../user_social_account/user_social_account.service', () => ({
  default: {
    findUserIdByProvider: vi.fn(async () => null),
    getByUserId: vi.fn(async () => []),
    link: vi.fn(async () => {}),
    unlink: vi.fn(async () => {}),
    updateTokens: vi.fn(async () => {}),
  },
}));

vi.mock('../user/user.service', () => ({
  default: {
    getById: vi.fn(async (id: string) => ({
      userId: id,
      email: 'sso@example.com',
      userRole: 'USER',
      userStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    getByEmail: vi.fn(async () => null),
    create: vi.fn(async (data: any) => ({
      userId: 'new-user-id',
      email: data.email,
      userRole: 'USER',
      userStatus: 'ACTIVE',
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  },
}));

import SSOService from './auth_sso.service';
import SSOMessages from './auth_sso.messages';
import { isProviderConfigured, getAllowedProviders } from './auth_sso.config';
import { getProvider } from './providers';
import UserSocialAccountService from '../user_social_account/user_social_account.service';
import UserService from '../user/user.service';

beforeEach(() => {
  vi.clearAllMocks();
  (isProviderConfigured as any).mockImplementation((p: string) => ['google', 'github'].includes(p));
  (getAllowedProviders as any).mockReturnValue(['google', 'github']);
  (getProvider as any).mockReturnValue(mockProviderInstance);
  mockProviderInstance.generateAuthUrl.mockReturnValue('https://provider.example.com/auth?client_id=test');
  mockProviderInstance.getTokens.mockResolvedValue({ accessToken: 'access-token-123', refreshToken: 'refresh-token-456' });
  mockProviderInstance.getUserInfo.mockResolvedValue({
    sub: 'provider-user-id',
    email: 'sso@example.com',
    name: 'SSO User',
    picture: null,
    provider: 'google',
  });
  (UserSocialAccountService.findUserIdByProvider as any).mockResolvedValue(null);
  (UserSocialAccountService.getByUserId as any).mockResolvedValue([]);
  (UserSocialAccountService.link as any).mockResolvedValue(undefined);
  (UserService.getByEmail as any).mockResolvedValue(null);
  (UserService.getById as any).mockResolvedValue({
    userId: 'existing-user-id',
    email: 'sso@example.com',
    userRole: 'USER',
    userStatus: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  (UserService.create as any).mockResolvedValue({
    userId: 'new-user-id',
    email: 'sso@example.com',
    userRole: 'USER',
    userStatus: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe('SSOService.getAllowedProviders', () => {
  it('returns configured providers from env', () => {
    const providers = SSOService.getAllowedProviders();
    expect(providers).toContain('google');
    expect(providers).toContain('github');
  });
});

describe('SSOService.isProviderEnabled', () => {
  it('returns true for an allowed provider', () => {
    expect(SSOService.isProviderEnabled('google')).toBe(true);
  });

  it('returns false for a non-allowed provider', () => {
    (getAllowedProviders as any).mockReturnValue(['google', 'github']);
    expect(SSOService.isProviderEnabled('apple')).toBe(false);
  });
});

describe('SSOService.generateAuthUrl', () => {
  it('returns a URL for a configured provider', () => {
    const url = SSOService.generateAuthUrl('google', 'my-state');
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
    expect(mockProviderInstance.generateAuthUrl).toHaveBeenCalledWith('my-state');
  });

  it('throws PROVIDER_NOT_CONFIGURED for an unconfigured provider', () => {
    (isProviderConfigured as any).mockReturnValue(false);
    expect(() => SSOService.generateAuthUrl('apple')).toThrow(
      SSOMessages.PROVIDER_NOT_CONFIGURED
    );
  });
});

describe('SSOService.handleCallback', () => {
  it('returns profile and tokens for valid code', async () => {
    const result = await SSOService.handleCallback('google', 'valid-code');
    expect(result.profile.email).toBe('sso@example.com');
    expect(result.tokens.accessToken).toBe('access-token-123');
  });

  it('throws CODE_NOT_FOUND when code is empty', async () => {
    await expect(SSOService.handleCallback('google', '')).rejects.toThrow(
      SSOMessages.CODE_NOT_FOUND
    );
  });

  it('throws PROVIDER_NOT_CONFIGURED when provider is not configured', async () => {
    (isProviderConfigured as any).mockReturnValue(false);
    await expect(SSOService.handleCallback('apple', 'some-code')).rejects.toThrow(
      SSOMessages.PROVIDER_NOT_CONFIGURED
    );
  });
});

describe('SSOService.authenticateOrRegister', () => {
  it('creates a new user when no existing social account or email account exists', async () => {
    const result = await SSOService.authenticateOrRegister('google', 'auth-code');
    expect(result.isNewUser).toBe(true);
    expect(UserService.create).toHaveBeenCalled();
    expect(UserSocialAccountService.link).toHaveBeenCalled();
  });

  it('returns existing user when social account already linked', async () => {
    (UserSocialAccountService.findUserIdByProvider as any).mockResolvedValue('existing-user-id');
    (UserSocialAccountService.getByUserId as any).mockResolvedValue([
      { userSocialAccountId: 'account-1', provider: 'google' },
    ]);

    const result = await SSOService.authenticateOrRegister('google', 'auth-code');
    expect(result.isNewUser).toBe(false);
    expect(UserSocialAccountService.updateTokens).toHaveBeenCalledWith(
      'account-1',
      'access-token-123',
      'refresh-token-456'
    );
  });

  it('links social account to existing email-matched user', async () => {
    (UserSocialAccountService.findUserIdByProvider as any).mockResolvedValue(null);
    (UserService.getByEmail as any).mockResolvedValue({
      userId: 'email-user-id',
      email: 'sso@example.com',
    });

    const result = await SSOService.authenticateOrRegister('google', 'auth-code');
    expect(result.isNewUser).toBe(false);
    expect(UserSocialAccountService.link).toHaveBeenCalledWith(
      'email-user-id',
      'google',
      'provider-user-id',
      'access-token-123',
    );
  });

  it('throws EMAIL_NOT_FOUND when provider returns no email', async () => {
    mockProviderInstance.getUserInfo.mockResolvedValue({
      sub: 'provider-user-id',
      email: null,
      name: null,
      picture: null,
      provider: 'google',
    });

    await expect(SSOService.authenticateOrRegister('google', 'auth-code')).rejects.toThrow(
      SSOMessages.EMAIL_NOT_FOUND
    );
  });
});

describe('SSOService.linkAccount', () => {
  it('calls UserSocialAccountService.link with correct arguments', async () => {
    await SSOService.linkAccount('user-xyz', 'github', 'github-code');
    expect(UserSocialAccountService.link).toHaveBeenCalledWith(
      'user-xyz',
      'github',
      'provider-user-id',
      'access-token-123',
      'refresh-token-456',
      undefined
    );
  });
});

describe('SSOService.unlinkAccount', () => {
  it('calls UserSocialAccountService.unlink', async () => {
    await SSOService.unlinkAccount('user-xyz', 'github');
    expect(UserSocialAccountService.unlink).toHaveBeenCalledWith('user-xyz', 'github');
  });
});

describe('SSOService.getLinkedAccounts', () => {
  it('returns social accounts for a user', async () => {
    const accounts = [{ userSocialAccountId: 'acc-1', provider: 'google' }];
    (UserSocialAccountService.getByUserId as any).mockResolvedValue(accounts);

    const result = await SSOService.getLinkedAccounts('user-xyz');
    expect(result).toEqual(accounts);
  });
});
