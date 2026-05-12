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
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/modules/redis', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    ping: vi.fn(),
    hset: vi.fn(),
    hgetall: vi.fn(),
    hdel: vi.fn(),
    expire: vi.fn(),
    publish: vi.fn(),
    sadd: vi.fn(),
    smembers: vi.fn(),
    srem: vi.fn(),
  },
  createRedisConnection: vi.fn(() => ({
    subscribe: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  })),
}));

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('../notification_push/notification_push.service', () => ({
  default: {
    sendToUser: vi.fn(async () => {}),
  },
}));

import NotificationInAppService from './notification_inapp.service';
import redis from '@/modules/redis';
import { getSystemDataSource } from '@/modules/db';

const mockRedis = redis as any;

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
  it('stores notification in redis and returns a Notification object', async () => {
    const userId = 'user-abc';
    const payload = { title: 'Hello', message: 'World', path: '/home' };

    const result = await NotificationInAppService.push(userId, payload);

    expect(result.title).toBe('Hello');
    expect(result.message).toBe('World');
    expect(result.path).toBe('/home');
    expect(result.isRead).toBe(false);
    expect(result.notificationId).toBeTruthy();
    expect(mockRedis.hset).toHaveBeenCalledWith(
      `notifications:${userId}`,
      result.notificationId,
      expect.any(String)
    );
    expect(mockRedis.publish).toHaveBeenCalledWith(
      `notifications:${userId}`,
      expect.any(String)
    );
  });

  it('defaults path to null when not provided', async () => {
    const result = await NotificationInAppService.push('user-1', { title: 'T', message: 'M' });
    expect(result.path).toBeNull();
  });
});

describe('NotificationInAppService.pushToUsers', () => {
  it('calls push for each userId', async () => {
    const spy = vi.spyOn(NotificationInAppService, 'push').mockResolvedValue({
      notificationId: 'n1',
      title: 'T',
      message: 'M',
      path: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await NotificationInAppService.pushToUsers(['u1', 'u2', 'u3'], { title: 'T', message: 'M' });
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });
});

describe('NotificationInAppService.pushToRole', () => {
  it('queries users by role and pushes notification to each', async () => {
    const mockFind = vi.fn(async () => [{ userId: 'u1' }, { userId: 'u2' }]);
    (getSystemDataSource as any).mockResolvedValue({
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

    await NotificationInAppService.pushToRole('ADMIN', { title: 'Admin Note', message: 'Check this' });

    expect(mockFind).toHaveBeenCalledWith({ where: { userRole: 'ADMIN' }, select: ['userId'] });
    expect(pushSpy).toHaveBeenCalledTimes(2);
    pushSpy.mockRestore();
  });
});

describe('NotificationInAppService.getAll', () => {
  it('returns empty array when no notifications exist', async () => {
    mockRedis.hgetall.mockResolvedValue(null);
    mockRedis.smembers.mockResolvedValue([]);
    const result = await NotificationInAppService.getAll('user-1');
    expect(result).toEqual([]);
  });

  it('returns notifications sorted newest first with read status applied', async () => {
    const now = new Date();
    const older = new Date(now.getTime() - 60000);

    const n1 = { notificationId: 'id-1', title: 'A', message: 'a', path: null, isRead: false, createdAt: now.toISOString() };
    const n2 = { notificationId: 'id-2', title: 'B', message: 'b', path: null, isRead: false, createdAt: older.toISOString() };

    mockRedis.hgetall.mockResolvedValue({
      'id-1': JSON.stringify(n1),
      'id-2': JSON.stringify(n2),
    });
    mockRedis.smembers.mockResolvedValue(['id-1']); // id-1 is read

    const result = await NotificationInAppService.getAll('user-1');
    expect(result[0].notificationId).toBe('id-1'); // newest first
    expect(result[0].isRead).toBe(true);
    expect(result[1].isRead).toBe(false);
  });
});

describe('NotificationInAppService.unreadCount', () => {
  it('returns count of unread notifications', async () => {
    const n1 = { notificationId: 'id-1', title: 'A', message: 'a', path: null, isRead: false, createdAt: new Date().toISOString() };
    const n2 = { notificationId: 'id-2', title: 'B', message: 'b', path: null, isRead: false, createdAt: new Date().toISOString() };

    mockRedis.hgetall.mockResolvedValue({
      'id-1': JSON.stringify(n1),
      'id-2': JSON.stringify(n2),
    });
    mockRedis.smembers.mockResolvedValue(['id-1']); // id-1 is read

    const count = await NotificationInAppService.unreadCount('user-1');
    expect(count).toBe(1);
  });
});

describe('NotificationInAppService.markAsRead', () => {
  it('adds notification id to read set in redis', async () => {
    await NotificationInAppService.markAsRead('user-1', 'notif-id-1');
    expect(mockRedis.sadd).toHaveBeenCalledWith('notifications_read:user-1', 'notif-id-1');
  });
});

describe('NotificationInAppService.markAllAsRead', () => {
  it('does nothing when there are no notifications', async () => {
    mockRedis.hgetall.mockResolvedValue(null);
    mockRedis.smembers.mockResolvedValue([]);
    await NotificationInAppService.markAllAsRead('user-1');
    expect(mockRedis.sadd).not.toHaveBeenCalled();
  });

  it('marks all notification ids as read', async () => {
    const n1 = { notificationId: 'id-1', title: 'A', message: 'a', path: null, isRead: false, createdAt: new Date().toISOString() };
    mockRedis.hgetall.mockResolvedValue({ 'id-1': JSON.stringify(n1) });
    mockRedis.smembers.mockResolvedValue([]);

    await NotificationInAppService.markAllAsRead('user-1');
    expect(mockRedis.sadd).toHaveBeenCalledWith('notifications_read:user-1', 'id-1');
  });
});

describe('NotificationInAppService.deleteOne', () => {
  it('removes notification from hash and read set', async () => {
    await NotificationInAppService.deleteOne('user-1', 'notif-id-1');
    expect(mockRedis.hdel).toHaveBeenCalledWith('notifications:user-1', 'notif-id-1');
    expect(mockRedis.srem).toHaveBeenCalledWith('notifications_read:user-1', 'notif-id-1');
  });
});

describe('NotificationInAppService.clearAll', () => {
  it('deletes both the notification hash and read set', async () => {
    await NotificationInAppService.clearAll('user-1');
    expect(mockRedis.del).toHaveBeenCalledWith('notifications:user-1');
    expect(mockRedis.del).toHaveBeenCalledWith('notifications_read:user-1');
  });
});
