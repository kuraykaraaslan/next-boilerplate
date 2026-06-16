import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@nb/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
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
  },
}));

vi.mock('@nb/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@nb/redis', () => ({
  default: {
    hgetall: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async () => []),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
    hset: vi.fn(async () => 1),
    hdel: vi.fn(async () => 1),
    sadd: vi.fn(async () => 1),
    srem: vi.fn(async () => 1),
    smembers: vi.fn(async () => []),
    publish: vi.fn(async () => 0),
  },
  createRedisConnection: vi.fn(() => ({
    subscribe: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  })),
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));

vi.mock('@nb/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@nb/notification_push/server/notification_push.service', () => ({
  default: {
    sendToUser: vi.fn(async () => {}),
  },
}));

import NotificationInAppService from '../notification_inapp.service';
import redis from '@nb/redis';
import { tenantDataSourceFor } from '@nb/db';

const mockRedis = redis as any;
const TENANT_ID = '00000000-0000-4000-8000-000000000000';

beforeEach(() => {
  vi.clearAllMocks();
  mockRedis.hset.mockResolvedValue(1);
  mockRedis.expire.mockResolvedValue(1);
  mockRedis.publish.mockResolvedValue(1);
  mockRedis.sadd.mockResolvedValue(1);
  mockRedis.smembers.mockResolvedValue([]);
  mockRedis.hgetall.mockResolvedValue({});
  mockRedis.hdel.mockResolvedValue(1);
  mockRedis.del.mockResolvedValue(1);
  mockRedis.srem.mockResolvedValue(1);
});

describe('NotificationInAppService.push', () => {
  it('stores notification under tenant-scoped key and publishes on tenant channel', async () => {
    const userId = 'user-abc';
    const payload = { title: 'Hello', message: 'World', path: '/home' };

    const result = await NotificationInAppService.push(TENANT_ID, userId, payload);
    if (!result) throw new Error('expected a notification');

    expect(result.title).toBe('Hello');
    expect(result.message).toBe('World');
    expect(result.path).toBe('/home');
    expect(result.isRead).toBe(false);
    expect(result.notificationId).toBeTruthy();
    expect(mockRedis.hset).toHaveBeenCalledWith(
      `notifications:${TENANT_ID}:${userId}`,
      result.notificationId,
      expect.any(String)
    );
    expect(mockRedis.publish).toHaveBeenCalledWith(
      `notifications:tenant:${TENANT_ID}:user:${userId}`,
      expect.any(String)
    );
  });

  it('defaults path to null when not provided', async () => {
    const result = await NotificationInAppService.push(TENANT_ID, 'user-1', { title: 'T', message: 'M' });
    expect(result?.path).toBeNull();
  });
});

describe('NotificationInAppService.pushToUsers', () => {
  it('calls push for each userId with same tenantId', async () => {
    const spy = vi.spyOn(NotificationInAppService, 'push').mockResolvedValue({
      notificationId: 'n1',
      title: 'T',
      message: 'M',
      path: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await NotificationInAppService.pushToUsers(TENANT_ID, ['u1', 'u2', 'u3'], { title: 'T', message: 'M' });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith(TENANT_ID, 'u1', expect.anything());
    spy.mockRestore();
  });
});

describe('NotificationInAppService.pushToRole', () => {
  it('queries tenant members by role and pushes to each', async () => {
    const mockFind = vi.fn(async () => [{ userId: 'u1' }, { userId: 'u2' }]);
    (tenantDataSourceFor as any).mockResolvedValue({
      getRepository: () => ({ find: mockFind }),
    });

    const pushSpy = vi.spyOn(NotificationInAppService, 'push').mockResolvedValue({
      notificationId: 'n1',
      title: 'T',
      message: 'M',
      path: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await NotificationInAppService.pushToRole(TENANT_ID, 'ADMIN', { title: 'Admin Note', message: 'Check this' });

    expect(mockFind).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
      select: ['userId'],
    });
    expect(pushSpy).toHaveBeenCalledTimes(2);
    pushSpy.mockRestore();
  });
});

describe('NotificationInAppService.getAll', () => {
  it('returns empty array when no notifications exist', async () => {
    mockRedis.hgetall.mockResolvedValue(null);
    mockRedis.smembers.mockResolvedValue([]);
    const result = await NotificationInAppService.getAll(TENANT_ID, 'user-1');
    expect(result).toEqual([]);
  });

  it('returns notifications sorted newest first with read status applied', async () => {
    const now = new Date();
    const older = new Date(now.getTime() - 60000);

    const ID_1 = '11111111-1111-4111-8111-111111111111';
    const ID_2 = '22222222-2222-4222-8222-222222222222';
    const n1 = { notificationId: ID_1, title: 'A', message: 'a', path: null, isRead: false, createdAt: now.toISOString() };
    const n2 = { notificationId: ID_2, title: 'B', message: 'b', path: null, isRead: false, createdAt: older.toISOString() };

    mockRedis.hgetall.mockResolvedValue({
      [ID_1]: JSON.stringify(n1),
      [ID_2]: JSON.stringify(n2),
    });
    mockRedis.smembers.mockResolvedValue([ID_1]);

    const result = await NotificationInAppService.getAll(TENANT_ID, 'user-1');
    expect(result[0].notificationId).toBe(ID_1);
    expect(result[0].isRead).toBe(true);
    expect(result[1].isRead).toBe(false);
  });
});

describe('NotificationInAppService.unreadCount', () => {
  it('returns count of unread notifications', async () => {
    const ID_1 = '11111111-1111-4111-8111-111111111111';
    const ID_2 = '22222222-2222-4222-8222-222222222222';
    const n1 = { notificationId: ID_1, title: 'A', message: 'a', path: null, isRead: false, createdAt: new Date().toISOString() };
    const n2 = { notificationId: ID_2, title: 'B', message: 'b', path: null, isRead: false, createdAt: new Date().toISOString() };

    mockRedis.hgetall.mockResolvedValue({
      [ID_1]: JSON.stringify(n1),
      [ID_2]: JSON.stringify(n2),
    });
    mockRedis.smembers.mockResolvedValue([ID_1]);

    const count = await NotificationInAppService.unreadCount(TENANT_ID, 'user-1');
    expect(count).toBe(1);
  });
});

describe('NotificationInAppService.markAsRead', () => {
  it('adds notification id to tenant-scoped read set', async () => {
    await NotificationInAppService.markAsRead(TENANT_ID, 'user-1', 'notif-id-1');
    expect(mockRedis.sadd).toHaveBeenCalledWith(
      `notifications_read:${TENANT_ID}:user-1`,
      'notif-id-1'
    );
  });
});

describe('NotificationInAppService.markAllAsRead', () => {
  it('does nothing when there are no notifications', async () => {
    mockRedis.hgetall.mockResolvedValue(null);
    mockRedis.smembers.mockResolvedValue([]);
    await NotificationInAppService.markAllAsRead(TENANT_ID, 'user-1');
    expect(mockRedis.sadd).not.toHaveBeenCalled();
  });

  it('marks all notification ids as read', async () => {
    const ID_1 = '11111111-1111-4111-8111-111111111111';
    const n1 = { notificationId: ID_1, title: 'A', message: 'a', path: null, isRead: false, createdAt: new Date().toISOString() };
    mockRedis.hgetall.mockResolvedValue({ [ID_1]: JSON.stringify(n1) });
    mockRedis.smembers.mockResolvedValue([]);

    await NotificationInAppService.markAllAsRead(TENANT_ID, 'user-1');
    expect(mockRedis.sadd).toHaveBeenCalledWith(
      `notifications_read:${TENANT_ID}:user-1`,
      ID_1
    );
  });
});

describe('NotificationInAppService.deleteOne', () => {
  it('removes notification from tenant-scoped hash and read set', async () => {
    await NotificationInAppService.deleteOne(TENANT_ID, 'user-1', 'notif-id-1');
    expect(mockRedis.hdel).toHaveBeenCalledWith(`notifications:${TENANT_ID}:user-1`, 'notif-id-1');
    expect(mockRedis.srem).toHaveBeenCalledWith(`notifications_read:${TENANT_ID}:user-1`, 'notif-id-1');
  });
});

describe('NotificationInAppService.clearAll', () => {
  it('deletes both the tenant-scoped notification hash and read set', async () => {
    await NotificationInAppService.clearAll(TENANT_ID, 'user-1');
    expect(mockRedis.del).toHaveBeenCalledWith(`notifications:${TENANT_ID}:user-1`);
    expect(mockRedis.del).toHaveBeenCalledWith(`notifications_read:${TENANT_ID}:user-1`);
  });
});
