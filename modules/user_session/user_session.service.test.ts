import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    SESSION_TTL_SECONDS: 3600,
    REFRESH_TOKEN_TTL_SECONDS: 86400,
    APPLICATION_DOMAIN: 'localhost',
    ACCESS_TOKEN_EXPIRES_IN: '1h',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    SESSION_EXPIRY_MS: 604800000,
    SESSION_CACHE_TTL: 300,
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/modules/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    ping: vi.fn(),
    keys: vi.fn(async () => []),
  },
}));

vi.mock('@/modules/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock.jwt.token'),
    verify: vi.fn((token: string) => {
      if (token === 'expired.token') {
        const err = new Error('jwt expired');
        (err as any).name = 'TokenExpiredError';
        throw err;
      }
      if (token === 'invalid.token') {
        throw new Error('invalid token');
      }
      return { userId: USER_ID, userSessionId: SESSION_ID };
    }),
    TokenExpiredError: class TokenExpiredError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'TokenExpiredError';
      }
    },
  },
}));

import { getSystemDataSource } from '@/modules/db';
import redis from '@/modules/redis';
import UserSessionMessages from './user_session.messages';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-1000-8000-000000000001';
const SESSION_ID = '00000000-0000-1000-8000-000000000002';
const now = new Date();
const future = new Date(now.getTime() + 1000 * 60 * 60 * 24);

const mockSessionEntity = {
  userSessionId: SESSION_ID,
  userId: USER_ID,
  accessToken: 'hashed_access',
  refreshToken: 'hashed_refresh',
  deviceFingerprint: null,
  userAgent: 'Mozilla/5.0',
  ipAddress: '127.0.0.1',
  sessionStatus: 'ACTIVE',
  otpVerifyNeeded: false,
  sessionExpiry: future,
  createdAt: now,
  updatedAt: now,
  metadata: null,
};

const mockUser = {
  userId: USER_ID,
  email: 'user@example.com',
  phone: null,
  userRole: 'USER',
  userStatus: 'ACTIVE',
  emailVerifiedAt: now,
  createdAt: now,
  updatedAt: now,
};

const mockUserSecurity = {
  userSecurityId: '00000000-0000-1000-8000-000000000003',
  userId: USER_ID,
  otpMethods: [],
  createdAt: now,
  updatedAt: now,
};

function clean(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function makeRepo(sessionOverride: any = mockSessionEntity) {
  return {
    findOne: vi.fn(async () => sessionOverride),
    find: vi.fn(async () => [sessionOverride]),
    save: vi.fn(async (e: any) => ({ ...mockSessionEntity, ...clean(e) })),
    create: vi.fn((data: any) => ({ ...mockSessionEntity, ...clean(data) })),
    update: vi.fn(async () => ({ affected: 1 })),
    delete: vi.fn(async () => ({ affected: 1 })),
    count: vi.fn(async () => 0),
  };
}

function mockSystemDs(sessionOverride?: any) {
  const repo = makeRepo(sessionOverride);
  (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

// ─── Token service ────────────────────────────────────────────────────────────

describe('UserSessionTokenService (via UserSessionService)', () => {
  // Import after mocks are set up
  let UserSessionService: typeof import('./user_session.service').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    UserSessionService = (await import('./user_session.service')).default;
  });

  it('generateAccessToken returns a token string', () => {
    const token = UserSessionService.generateAccessToken({ userId: USER_ID, userSessionId: SESSION_ID });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('generateRefreshToken returns a token string', () => {
    const token = UserSessionService.generateRefreshToken({ userId: USER_ID, userSessionId: SESSION_ID });
    expect(typeof token).toBe('string');
  });

  it('hashToken returns a consistent hex hash', () => {
    const hash1 = UserSessionService.hashToken('my-token');
    const hash2 = UserSessionService.hashToken('my-token');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generateDeviceFingerprint returns a consistent hex hash', () => {
    const fp1 = UserSessionService.generateDeviceFingerprint({ ip: '127.0.0.1', userAgent: 'Chrome' });
    const fp2 = UserSessionService.generateDeviceFingerprint({ ip: '127.0.0.1', userAgent: 'Chrome' });
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generateDeviceFingerprint varies by input', () => {
    const fp1 = UserSessionService.generateDeviceFingerprint({ ip: '127.0.0.1' });
    const fp2 = UserSessionService.generateDeviceFingerprint({ ip: '192.168.1.1' });
    expect(fp1).not.toBe(fp2);
  });

  it('verifyAccessToken returns payload for valid token', () => {
    const payload = UserSessionService.verifyAccessToken('valid.token');
    expect(payload.userId).toBe(USER_ID);
    expect(payload.userSessionId).toBe(SESSION_ID);
  });

  it('verifyAccessToken throws INVALID_TOKEN for invalid token', () => {
    expect(() => UserSessionService.verifyAccessToken('invalid.token'))
      .toThrow(UserSessionMessages.INVALID_TOKEN);
  });

  it('verifyRefreshToken returns payload for valid token', () => {
    const payload = UserSessionService.verifyRefreshToken('valid.refresh');
    expect(payload.userId).toBe(USER_ID);
  });
});

// ─── createSession ────────────────────────────────────────────────────────────

describe('UserSessionCrudService.createSession', () => {
  let UserSessionService: typeof import('./user_session.service').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    UserSessionService = (await import('./user_session.service')).default;
  });

  it('creates and returns session with access and refresh tokens', async () => {
    mockSystemDs();
    const result = await UserSessionService.createSession({
      user: mockUser as any,
      userSecurity: mockUserSecurity as any,
    });
    expect(result.userSession.userId).toBe(USER_ID);
    expect(typeof result.rawAccessToken).toBe('string');
    expect(typeof result.rawRefreshToken).toBe('string');
  });

  it('marks otpVerifyNeeded when user has OTP methods', async () => {
    const repo = mockSystemDs();
    const otpSecurity = { ...mockUserSecurity, otpMethods: ['TOTP'] };
    const sessionWithOtp = { ...mockSessionEntity, otpVerifyNeeded: true };
    repo.save = vi.fn(async () => sessionWithOtp);

    const result = await UserSessionService.createSession({
      user: mockUser as any,
      userSecurity: otpSecurity as any,
    });
    expect(result.userSession.otpVerifyNeeded).toBe(true);
  });

  it('does not set otpVerifyNeeded when otpIgnore is true', async () => {
    const repo = mockSystemDs();
    const otpSecurity = { ...mockUserSecurity, otpMethods: ['TOTP'] };
    repo.save = vi.fn(async (e: any) => ({ ...mockSessionEntity, ...e }));

    const result = await UserSessionService.createSession({
      user: mockUser as any,
      userSecurity: otpSecurity as any,
      otpIgnore: true,
    });
    expect(result.userSession.otpVerifyNeeded).toBe(false);
  });
});

// ─── getSession ───────────────────────────────────────────────────────────────

describe('UserSessionCrudService.getSession', () => {
  let UserSessionService: typeof import('./user_session.service').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
    UserSessionService = (await import('./user_session.service')).default;
  });

  it('throws SESSION_NOT_FOUND when session does not exist in DB', async () => {
    mockSystemDs(null);
    await expect(UserSessionService.getSession({ accessToken: 'valid.token' }))
      .rejects.toThrow(UserSessionMessages.SESSION_NOT_FOUND);
  });

  it('throws SESSION_EXPIRED for expired session', async () => {
    const expiredSession = { ...mockSessionEntity, sessionExpiry: new Date(0) };
    mockSystemDs(expiredSession);
    await expect(UserSessionService.getSession({ accessToken: 'valid.token' }))
      .rejects.toThrow(UserSessionMessages.SESSION_EXPIRED);
  });

  it('throws SESSION_REVOKED for revoked session', async () => {
    const revokedSession = { ...mockSessionEntity, sessionStatus: 'REVOKED' };
    mockSystemDs(revokedSession);
    await expect(UserSessionService.getSession({ accessToken: 'valid.token' }))
      .rejects.toThrow(UserSessionMessages.SESSION_REVOKED);
  });

  it('throws OTP_REQUIRED when otpVerifyNeeded is true', async () => {
    const otpSession = { ...mockSessionEntity, otpVerifyNeeded: true };
    mockSystemDs(otpSession);
    await expect(UserSessionService.getSession({ accessToken: 'valid.token' }))
      .rejects.toThrow(UserSessionMessages.OTP_REQUIRED);
  });

  it('returns session on happy path', async () => {
    mockSystemDs();
    const result = await UserSessionService.getSession({ accessToken: 'valid.token' });
    expect(result.userId).toBe(USER_ID);
    expect(result.sessionStatus).toBe('ACTIVE');
  });

  it('returns session from cache when cache is warm', async () => {
    const cachedSession = {
      userSessionId: SESSION_ID,
      userId: USER_ID,
      deviceFingerprint: null,
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
      sessionStatus: 'ACTIVE',
      otpVerifyNeeded: false,
      sessionExpiry: future.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      metadata: null,
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cachedSession));
    const result = await UserSessionService.getSession({ accessToken: 'valid.token' });
    expect(result.userId).toBe(USER_ID);
    expect(getSystemDataSource).not.toHaveBeenCalled();
  });
});

// ─── updateSession ────────────────────────────────────────────────────────────

describe('UserSessionCrudService.updateSession', () => {
  let UserSessionService: typeof import('./user_session.service').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    UserSessionService = (await import('./user_session.service')).default;
  });

  it('throws SESSION_NOT_FOUND when session does not exist', async () => {
    mockSystemDs(null);
    await expect(UserSessionService.updateSession(SESSION_ID, { otpVerifyNeeded: false }))
      .rejects.toThrow(UserSessionMessages.SESSION_NOT_FOUND);
  });

  it('updates and returns the session', async () => {
    const repo = makeRepo();
    const updatedSession = { ...mockSessionEntity, otpVerifyNeeded: false };
    repo.findOne = vi.fn()
      .mockResolvedValueOnce(mockSessionEntity) // existence check
      .mockResolvedValueOnce(updatedSession);   // after update
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await UserSessionService.updateSession(SESSION_ID, { otpVerifyNeeded: false });
    expect(result.otpVerifyNeeded).toBe(false);
  });
});

// ─── deleteSession ────────────────────────────────────────────────────────────

describe('UserSessionCrudService.deleteSession', () => {
  let UserSessionService: typeof import('./user_session.service').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    (redis.keys as any).mockResolvedValue([]);
    UserSessionService = (await import('./user_session.service')).default;
  });

  it('does nothing when session does not exist', async () => {
    const repo = mockSystemDs(null);
    await UserSessionService.deleteSession(SESSION_ID);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('deletes the session when found', async () => {
    const repo = mockSystemDs();
    await UserSessionService.deleteSession(SESSION_ID);
    expect(repo.delete).toHaveBeenCalledWith({ userSessionId: SESSION_ID });
  });
});

// ─── getUserSessions ──────────────────────────────────────────────────────────

describe('UserSessionCrudService.getUserSessions', () => {
  let UserSessionService: typeof import('./user_session.service').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    UserSessionService = (await import('./user_session.service')).default;
  });

  it('returns empty array when no sessions exist', async () => {
    const repo = mockSystemDs();
    repo.find = vi.fn(async () => []);
    const result = await UserSessionService.getUserSessions(USER_ID);
    expect(result).toEqual([]);
  });

  it('returns active non-expired sessions', async () => {
    mockSystemDs();
    const result = await UserSessionService.getUserSessions(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(USER_ID);
  });

  it('filters out expired sessions', async () => {
    const repo = mockSystemDs();
    const expiredSession = { ...mockSessionEntity, sessionExpiry: new Date(0) };
    repo.find = vi.fn(async () => [expiredSession]);

    const result = await UserSessionService.getUserSessions(USER_ID);
    expect(result).toHaveLength(0);
  });
});

// ─── clearUserSessionCache ────────────────────────────────────────────────────

describe('UserSessionCacheService.clearUserSessionCache', () => {
  let UserSessionService: typeof import('./user_session.service').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    UserSessionService = (await import('./user_session.service')).default;
  });

  it('does nothing when no cache keys exist', async () => {
    (redis.keys as any).mockResolvedValue([]);
    await UserSessionService.clearUserSessionCache(USER_ID);
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('deletes all matching session keys', async () => {
    const keys = [`session:${USER_ID}:hash1`, `session:${USER_ID}:hash2`];
    (redis.keys as any).mockResolvedValue(keys);
    (redis.del as any).mockResolvedValue(2);

    await UserSessionService.clearUserSessionCache(USER_ID);
    expect(redis.del).toHaveBeenCalledWith(...keys);
  });
});
