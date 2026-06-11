import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@/modules/redis', () => ({
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
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

// Mock BullMQ to avoid real Redis connections
vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    add = vi.fn(async () => ({}));
    close = vi.fn();
  },
  Worker: class MockWorker {
    close = vi.fn();
  },
  Job: vi.fn(),
}));

vi.mock('@/modules/redis/redis.bullmq', () => ({
  getBullMQConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
}));

import WebhookService from '../webhook.service';
import { tenantDataSourceFor } from '@/modules/db';
import WebhookMessages from '../webhook.messages';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import SettingService from '@/modules/setting/setting.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const WEBHOOK_ID = '770e8400-e29b-41d4-a716-446655440002';
const DELIVERY_ID = '880e8400-e29b-41d4-a716-446655440003';

const mockWebhook = {
  webhookId: WEBHOOK_ID,
  tenantId: TENANT_ID,
  createdByUserId: USER_ID,
  name: 'Test Webhook',
  description: null,
  url: 'https://example.com/hook',
  secret: 'supersecret',
  previousSecret: null,
  previousSecretExpiresAt: null,
  events: ['member.created', 'tenant.updated'],
  headers: null,
  eventFilters: null,
  tags: null,
  isActive: true,
  consecutiveFailures: 0,
  autoDisabledAt: null,
  ipAllowlist: null,
  rateLimitPerMinute: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makeWebhookRepo(webhook: typeof mockWebhook | null = mockWebhook) {
  const findOne = vi.fn(async () => webhook);
  const find = vi.fn(async () => (webhook ? [webhook] : []));
  const findAndCount = vi.fn(async () => [webhook ? [webhook] : [], webhook ? 1 : 0] as const);
  const create = vi.fn((data: any) => ({ ...mockWebhook, ...data }));
  const save = vi.fn(async (entity: any) => ({ ...mockWebhook, ...entity }));
  const remove = vi.fn(async () => {});
  return { findOne, find, findAndCount, create, save, remove };
}

function setupTenantDs(webhook: typeof mockWebhook | null = mockWebhook) {
  const repo = makeWebhookRepo(webhook);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

describe('WebhookService.signPayload', () => {
  it('returns signature starting with sha256=', () => {
    const sig = WebhookService.signPayload('secret', '{"event":"test"}');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('produces the same signature for the same inputs', () => {
    const body = '{"event":"member.created"}';
    expect(WebhookService.signPayload('key', body)).toBe(WebhookService.signPayload('key', body));
  });

  it('produces different signatures for different secrets', () => {
    const body = '{"event":"test"}';
    expect(WebhookService.signPayload('secret1', body)).not.toBe(WebhookService.signPayload('secret2', body));
  });
});

describe('WebhookService.generateSecret', () => {
  it('returns a 64-char hex string', () => {
    expect(WebhookService.generateSecret()).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different values on successive calls', () => {
    expect(WebhookService.generateSecret()).not.toBe(WebhookService.generateSecret());
  });
});

describe('WebhookService.dispatchEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not throw even when tenant DS fails', async () => {
    (tenantDataSourceFor as any).mockRejectedValue(new Error('DS unavailable'));
    await expect(WebhookService.dispatchEvent(TENANT_ID, 'member.created', { userId: USER_ID })).resolves.toBeUndefined();
  });

  it('filters webhooks that do not subscribe to the event', async () => {
    const webhookWithOtherEvent = { ...mockWebhook, events: ['payment.completed'] };
    const repo = makeWebhookRepo(webhookWithOtherEvent);
    // Override find to return a webhook that doesn't match
    repo.find.mockResolvedValue([webhookWithOtherEvent]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    // dispatch member.created — the webhook only listens to payment.completed
    await WebhookService.dispatchEvent(TENANT_ID, 'member.created', {});
    // Queue.add should not be called since no matching webhook
    expect(WebhookService.QUEUE.add).not.toHaveBeenCalled();
  });

  // Use ROOT_TENANT_ID so the billing gate is bypassed and the event filter is
  // the only thing deciding whether the delivery is enqueued.
  it('skips a webhook whose event filter does not match the payload', async () => {
    const filtered: any = { ...mockWebhook, tenantId: ROOT_TENANT_ID, events: ['payment.completed'], eventFilters: { 'payment.completed': { currency: 'USD' } } };
    const repo = makeWebhookRepo(filtered);
    repo.find.mockResolvedValue([filtered]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await WebhookService.dispatchEvent(ROOT_TENANT_ID, 'payment.completed', { currency: 'EUR' });
    expect(WebhookService.QUEUE.add).not.toHaveBeenCalled();
  });

  it('enqueues a webhook whose event filter matches the payload', async () => {
    const filtered: any = { ...mockWebhook, tenantId: ROOT_TENANT_ID, events: ['payment.completed'], eventFilters: { 'payment.completed': { currency: 'USD' } } };
    const repo = makeWebhookRepo(filtered);
    repo.find.mockResolvedValue([filtered]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await WebhookService.dispatchEvent(ROOT_TENANT_ID, 'payment.completed', { currency: 'USD', amount: 10 });
    expect(WebhookService.QUEUE.add).toHaveBeenCalledTimes(1);
  });
});

describe('WebhookService.dispatchPlatformEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes to root-tenant webhooks and enqueues a matching delivery', async () => {
    const rootWebhook = { ...mockWebhook, tenantId: ROOT_TENANT_ID, events: ['user.created'] };
    const repo = makeWebhookRepo(rootWebhook);
    repo.find.mockResolvedValue([rootWebhook]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    // Root tenant short-circuits the billing gate, so this exercises the enqueue path.
    await WebhookService.dispatchPlatformEvent('user.created', { userId: USER_ID });

    expect(tenantDataSourceFor).toHaveBeenCalledWith(ROOT_TENANT_ID);
    expect(WebhookService.QUEUE.add).toHaveBeenCalledTimes(1);
  });
});

describe('WebhookService.triggerEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enqueues a delivery for the chosen event on the target webhook', async () => {
    const repo = makeWebhookRepo({ ...mockWebhook, tenantId: ROOT_TENANT_ID });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await WebhookService.triggerEvent(ROOT_TENANT_ID, WEBHOOK_ID, 'user.created', { hello: 'world' });

    expect(WebhookService.QUEUE.add).toHaveBeenCalledTimes(1);
  });

  it('throws when the webhook does not exist', async () => {
    const repo = makeWebhookRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await expect(WebhookService.triggerEvent(ROOT_TENANT_ID, WEBHOOK_ID, 'user.created')).rejects.toThrow(WebhookMessages.NOT_FOUND);
  });
});


describe('WebhookService per-tenant delivery config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies webhookMaxAttempts from settings to the queued job', async () => {
    const rootWebhook = { ...mockWebhook, tenantId: ROOT_TENANT_ID, events: ['user.created'] };
    const repo = makeWebhookRepo(rootWebhook);
    repo.find.mockResolvedValue([rootWebhook]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const spy = vi.spyOn(SettingService, 'getByKeys').mockResolvedValue({ webhookMaxAttempts: '7' });

    await WebhookService.dispatchPlatformEvent('user.created', { userId: USER_ID });

    expect(spy).toHaveBeenCalled();
    const addArgs = (WebhookService.QUEUE.add as any).mock.calls[0];
    expect(addArgs[2]).toMatchObject({ attempts: 7 });
    spy.mockRestore();
  });

  it('falls back to defaults when the settings read throws', async () => {
    const rootWebhook = { ...mockWebhook, tenantId: ROOT_TENANT_ID, events: ['user.created'] };
    const repo = makeWebhookRepo(rootWebhook);
    repo.find.mockResolvedValue([rootWebhook]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const spy = vi.spyOn(SettingService, 'getByKeys').mockRejectedValue(new Error('settings down'));

    await WebhookService.dispatchPlatformEvent('user.created', { userId: USER_ID });

    const addArgs = (WebhookService.QUEUE.add as any).mock.calls[0];
    expect(addArgs[2]).toMatchObject({ attempts: 3 });
    spy.mockRestore();
  });
});
