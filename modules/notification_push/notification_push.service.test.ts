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
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-vapid-public',
    VAPID_PRIVATE_KEY: 'test-vapid-private',
    VAPID_CONTACT_EMAIL: 'admin@test.com',
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

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async () => ({ statusCode: 201 })),
  },
}));

import NotificationPushService from './notification_push.service';
import { getSystemDataSource } from '@/modules/db';
import webpush from 'web-push';

const mockWebPush = webpush as any;

const mockSub = {
  id: 'sub-1',
  userId: 'user-1',
  endpoint: 'https://example.com/push/endpoint',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
};

function makeRepo(overrides: Partial<Record<string, any>> = {}) {
  return {
    findOne: vi.fn(async () => null),
    find: vi.fn(async () => []),
    save: vi.fn(async (data: any) => ({ ...mockSub, ...data })),
    create: vi.fn((data: any) => ({ ...mockSub, ...data })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    ...overrides,
  };
}

function mockDataSource(repo: ReturnType<typeof makeRepo>) {
  (getSystemDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });
  return repo;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationPushService.subscribe', () => {
  it('creates a new subscription when none exists', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDataSource(repo);

    await NotificationPushService.subscribe('user-1', {
      endpoint: 'https://push.example.com/sub1',
      keys: { p256dh: 'p256key', auth: 'authkey' },
    });

    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it('updates an existing subscription when endpoint already exists', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => mockSub) });
    mockDataSource(repo);

    await NotificationPushService.subscribe('user-1', {
      endpoint: mockSub.endpoint,
      keys: { p256dh: 'new-p256', auth: 'new-auth' },
    });

    expect(repo.update).toHaveBeenCalledWith(
      { endpoint: mockSub.endpoint },
      expect.objectContaining({ userId: 'user-1' })
    );
  });
});

describe('NotificationPushService.unsubscribe', () => {
  it('deletes all subscriptions for a user', async () => {
    const repo = makeRepo();
    mockDataSource(repo);

    await NotificationPushService.unsubscribe('user-1');
    expect(repo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});

describe('NotificationPushService.unsubscribeByEndpoint', () => {
  it('deletes subscription by endpoint', async () => {
    const repo = makeRepo();
    mockDataSource(repo);

    await NotificationPushService.unsubscribeByEndpoint('https://push.example.com/sub1');
    expect(repo.delete).toHaveBeenCalledWith({ endpoint: 'https://push.example.com/sub1' });
  });
});

describe('NotificationPushService.sendToUser', () => {
  it('initializes VAPID and sends notifications to all user subscriptions', async () => {
    const repo = makeRepo({ find: vi.fn(async () => [mockSub]) });
    mockDataSource(repo);
    mockWebPush.sendNotification.mockResolvedValue({ statusCode: 201 });

    await NotificationPushService.sendToUser('user-1', { title: 'Hi', body: 'Hello' });

    expect(mockWebPush.setVapidDetails).toHaveBeenCalled();
    expect(mockWebPush.sendNotification).toHaveBeenCalledWith(
      { endpoint: mockSub.endpoint, keys: { p256dh: mockSub.p256dh, auth: mockSub.auth } },
      expect.any(String)
    );
  });

  it('does nothing when user has no subscriptions', async () => {
    const repo = makeRepo({ find: vi.fn(async () => []) });
    mockDataSource(repo);

    await NotificationPushService.sendToUser('user-1', { title: 'Hi', body: 'Hello' });
    expect(mockWebPush.sendNotification).not.toHaveBeenCalled();
  });

  it('removes expired subscription (410 status) without throwing', async () => {
    const repo = makeRepo({ find: vi.fn(async () => [mockSub]) });
    mockDataSource(repo);

    const error = Object.assign(new Error('Gone'), { statusCode: 410 });
    mockWebPush.sendNotification.mockRejectedValue(error);

    await expect(
      NotificationPushService.sendToUser('user-1', { title: 'Hi', body: 'Gone' })
    ).resolves.not.toThrow();

    expect(repo.delete).toHaveBeenCalledWith({ id: mockSub.id });
  });
});

describe('NotificationPushService.sendToAll', () => {
  it('fetches all subscriptions and sends to each', async () => {
    const sub2 = { ...mockSub, id: 'sub-2', userId: 'user-2', endpoint: 'https://push.example.com/sub2' };
    const repo = makeRepo({ find: vi.fn(async () => [mockSub, sub2]) });
    mockDataSource(repo);
    mockWebPush.sendNotification.mockResolvedValue({ statusCode: 201 });

    await NotificationPushService.sendToAll({ title: 'Broadcast', body: 'To all' });
    expect(mockWebPush.sendNotification).toHaveBeenCalledTimes(2);
  });
});

describe('NotificationPushService.sendToAdmins', () => {
  it('queries admin users and dispatches to their subscriptions', async () => {
    // First call: UserEntity repo (for role query)
    // Second call: PushSubscriptionEntity repo (for subs)
    const userRepo = { find: vi.fn(async () => [{ userId: 'admin-1' }]) };
    const subRepo = { find: vi.fn(async () => [mockSub]) };

    let callCount = 0;
    (getSystemDataSource as any).mockResolvedValue({
      getRepository: () => {
        callCount++;
        return callCount === 1 ? userRepo : subRepo;
      },
    });
    mockWebPush.sendNotification.mockResolvedValue({ statusCode: 201 });

    await NotificationPushService.sendToAdmins({ title: 'Admin Alert', body: 'Check now' });
    expect(mockWebPush.sendNotification).toHaveBeenCalled();
  });
});
