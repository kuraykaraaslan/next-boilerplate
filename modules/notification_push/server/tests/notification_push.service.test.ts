import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-vapid-public',
    VAPID_PRIVATE_KEY: 'test-vapid-private',
    VAPID_CONTACT_EMAIL: 'admin@test.com',
  },
}));

vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@kuraykaraaslan/redis', () => ({
  default: {
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
  },
  jitter: (n: number) => n,
  singleFlight: (_key: string, fn: () => Promise<unknown>) => fn(),
}));

vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: { getValue: vi.fn(async () => null), getByKeys: vi.fn(async () => ({})) },
}));

// Push backends are SANDBOXED community plugins resolved per-tenant via the
// external-contributions bridge. The Web Push encryption/VAPID send runs host-side
// in the `webpush` capability (here we mock the bridge `invoke`).
const { invokeMock, listExternalContributions } = vi.hoisted(() => {
  const invokeMock = vi.fn(async (): Promise<any> => ({ ok: true }));
  const listExternalContributions = vi.fn(async (tenantId: string, point: string) => {
    if (!tenantId || point !== 'push:provider') return [];
    return [{ key: 'webpush', configured: true, metadata: { label: 'Web Push (VAPID)' }, invoke: invokeMock }];
  });
  return { invokeMock, listExternalContributions };
});
vi.mock('@kuraykaraaslan/common/server/external-extensions', () => ({ listExternalContributions }));

import NotificationPushService from '../notification_push.service';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';

const TENANT_ID = '00000000-0000-4000-8000-000000000000';

const mockSub = {
  id: 'sub-1',
  tenantId: TENANT_ID,
  userId: 'user-1',
  endpoint: 'https://example.com/push/endpoint',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
};

function makeRepo(overrides: Partial<Record<string, any>> = {}) {
  return {
    findOne: vi.fn(async () => null),
    find: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    save: vi.fn(async (data: any) => ({ ...mockSub, ...data })),
    create: vi.fn((data: any) => ({ ...mockSub, ...data })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    ...overrides,
  };
}

function mockDataSource(repo: ReturnType<typeof makeRepo>) {
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

beforeEach(() => {
  vi.clearAllMocks();
  invokeMock.mockResolvedValue({ ok: true });
});

describe('NotificationPushService.subscribe', () => {
  it('creates a new subscription when none exists', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockDataSource(repo);

    await NotificationPushService.subscribe(TENANT_ID, 'user-1', {
      endpoint: 'https://push.example.com/sub1',
      keys: { p256dh: 'p256key', auth: 'authkey' },
    });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: TENANT_ID, userId: 'user-1' }));
    expect(repo.save).toHaveBeenCalled();
  });

  it('updates an existing subscription when (tenantId, endpoint) already exists', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => mockSub) });
    mockDataSource(repo);

    await NotificationPushService.subscribe(TENANT_ID, 'user-1', {
      endpoint: mockSub.endpoint,
      keys: { p256dh: 'new-p256', auth: 'new-auth' },
    });

    expect(repo.update).toHaveBeenCalledWith(
      { tenantId: TENANT_ID, endpoint: mockSub.endpoint },
      expect.objectContaining({ userId: 'user-1' })
    );
  });
});

describe('NotificationPushService.unsubscribe', () => {
  it('deletes all subscriptions for a user within a tenant', async () => {
    const repo = makeRepo();
    mockDataSource(repo);

    await NotificationPushService.unsubscribe(TENANT_ID, 'user-1');
    expect(repo.delete).toHaveBeenCalledWith({ tenantId: TENANT_ID, userId: 'user-1' });
  });
});

describe('NotificationPushService.unsubscribeByEndpoint', () => {
  it('deletes subscription by (tenantId, endpoint)', async () => {
    const repo = makeRepo();
    mockDataSource(repo);

    await NotificationPushService.unsubscribeByEndpoint(TENANT_ID, 'https://push.example.com/sub1');
    expect(repo.delete).toHaveBeenCalledWith({ tenantId: TENANT_ID, endpoint: 'https://push.example.com/sub1' });
  });
});

describe('NotificationPushService.sendToUser', () => {
  it('dispatches to the sandboxed push provider for each user subscription', async () => {
    const repo = makeRepo({ find: vi.fn(async () => [mockSub]) });
    mockDataSource(repo);

    await NotificationPushService.sendToUser(TENANT_ID, 'user-1', { title: 'Hi', body: 'Hello' });

    expect(invokeMock).toHaveBeenCalledWith('send', expect.objectContaining({
      subscription: { endpoint: mockSub.endpoint, p256dh: mockSub.p256dh, auth: mockSub.auth },
    }));
  });

  it('does nothing when user has no subscriptions', async () => {
    const repo = makeRepo({ find: vi.fn(async () => []) });
    mockDataSource(repo);

    await NotificationPushService.sendToUser(TENANT_ID, 'user-1', { title: 'Hi', body: 'Hello' });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('removes expired subscription (410 status) without throwing', async () => {
    const repo = makeRepo({ find: vi.fn(async () => [mockSub]) });
    mockDataSource(repo);
    invokeMock.mockResolvedValue({ ok: false, statusCode: 410, error: 'Gone' });

    await expect(
      NotificationPushService.sendToUser(TENANT_ID, 'user-1', { title: 'Hi', body: 'Gone' })
    ).resolves.not.toThrow();

    expect(repo.delete).toHaveBeenCalledWith({ id: mockSub.id });
  });
});

describe('NotificationPushService.sendToAll', () => {
  it('fetches all subscriptions in the tenant and sends to each', async () => {
    const sub2 = { ...mockSub, id: 'sub-2', userId: 'user-2', endpoint: 'https://push.example.com/sub2' };
    const repo = makeRepo({ find: vi.fn(async () => [mockSub, sub2]) });
    mockDataSource(repo);

    await NotificationPushService.sendToAll(TENANT_ID, { title: 'Broadcast', body: 'To all' });
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});

describe('NotificationPushService.sendToAdmins', () => {
  it('queries TenantMember for ADMIN role and dispatches to their subscriptions', async () => {
    const memberRepo = { find: vi.fn(async () => [{ userId: 'admin-1' }]) };
    const subRepo = { find: vi.fn(async () => [mockSub]) };

    let callCount = 0;
    (tenantDataSourceFor as any).mockResolvedValue({
      getRepository: () => {
        callCount++;
        return callCount === 1 ? memberRepo : subRepo;
      },
    });

    await NotificationPushService.sendToAdmins(TENANT_ID, { title: 'Admin Alert', body: 'Check now' });
    expect(memberRepo.find).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
      select: ['userId'],
    });
    expect(invokeMock).toHaveBeenCalled();
  });
});
