import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
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
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));
vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

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

vi.mock('@kuraykaraaslan/redis/server/redis.bullmq', () => ({
  getBullMQConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
}));

import WebhookDeliveryService from '../webhook.delivery.service';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import WebhookMessages from '../webhook.messages';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';

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

describe('WebhookService circuit breaker', () => {
  beforeEach(() => vi.clearAllMocks());

  function makeBreakerDs(webhook: any) {
    const save = vi.fn(async (w: any) => w);
    const repo = { findOne: vi.fn(async () => webhook), save };
    return { ds: { getRepository: () => repo }, save };
  }

  it('auto-disables an endpoint once consecutive failures reach the threshold', async () => {
    const webhook = { ...mockWebhook, consecutiveFailures: 1, isActive: true, autoDisabledAt: null };
    const { ds, save } = makeBreakerDs(webhook);

    await (WebhookDeliveryService as any).applyCircuitBreaker(ds, TENANT_ID, WEBHOOK_ID, false, 2);

    expect(webhook.consecutiveFailures).toBe(2);
    expect(webhook.isActive).toBe(false);
    expect(webhook.autoDisabledAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalled();
  });

  it('increments without disabling below the threshold', async () => {
    const webhook = { ...mockWebhook, consecutiveFailures: 0, isActive: true, autoDisabledAt: null };
    const { ds } = makeBreakerDs(webhook);

    await (WebhookDeliveryService as any).applyCircuitBreaker(ds, TENANT_ID, WEBHOOK_ID, false, 5);

    expect(webhook.consecutiveFailures).toBe(1);
    expect(webhook.isActive).toBe(true);
    expect(webhook.autoDisabledAt).toBeNull();
  });

  it('resets the failure counter on a successful delivery', async () => {
    const webhook = { ...mockWebhook, consecutiveFailures: 5, isActive: true };
    const { ds, save } = makeBreakerDs(webhook);

    await (WebhookDeliveryService as any).applyCircuitBreaker(ds, TENANT_ID, WEBHOOK_ID, true, 10);

    expect(webhook.consecutiveFailures).toBe(0);
    expect(save).toHaveBeenCalled();
  });
});
