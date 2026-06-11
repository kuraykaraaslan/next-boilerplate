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

import WebhookCrudService from '../webhook.crud.service';
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

describe('WebhookCrudService.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns webhooks and total', async () => {
    setupTenantDs(mockWebhook);
    const result = await WebhookCrudService.list({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.webhooks).toHaveLength(1);
    expect(result.webhooks[0].webhookId).toBe(WEBHOOK_ID);
  });

  it('does not expose secret in returned webhooks', async () => {
    setupTenantDs(mockWebhook);
    const result = await WebhookCrudService.list({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect((result.webhooks[0] as any).secret).toBeUndefined();
  });
});

describe('WebhookCrudService.getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when webhook does not exist', async () => {
    setupTenantDs(null);
    await expect(WebhookCrudService.getById(TENANT_ID, WEBHOOK_ID)).rejects.toThrow(WebhookMessages.NOT_FOUND);
  });

  it('returns SafeWebhook on success', async () => {
    setupTenantDs(mockWebhook);
    const result = await WebhookCrudService.getById(TENANT_ID, WEBHOOK_ID);
    expect(result.webhookId).toBe(WEBHOOK_ID);
    expect((result as any).secret).toBeUndefined();
  });
});

describe('WebhookCrudService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a webhook and returns SafeWebhook', async () => {
    const repo = makeWebhookRepo(mockWebhook);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await WebhookCrudService.create(TENANT_ID, USER_ID, {
      name: 'My Hook',
      url: 'https://example.com/callback',
      events: ['member.created'],
    });

    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect((result as any).secret).toBeUndefined();
  });

  it('sets isActive to true for new webhooks', async () => {
    const repo = makeWebhookRepo(mockWebhook);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await WebhookCrudService.create(TENANT_ID, USER_ID, {
      name: 'New Hook',
      url: 'https://example.com/new',
      events: ['payment.completed'],
    });

    const createArg = repo.create.mock.calls[0][0];
    expect(createArg.isActive).toBe(true);
  });

  it('generates a secret for each new webhook', async () => {
    const repo = makeWebhookRepo(mockWebhook);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await WebhookCrudService.create(TENANT_ID, USER_ID, {
      name: 'Secure Hook',
      url: 'https://example.com/secure',
      events: ['api_key.created'],
    });

    const createArg = repo.create.mock.calls[0][0];
    expect(createArg.secret).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('WebhookCrudService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when webhook does not exist', async () => {
    setupTenantDs(null);
    await expect(WebhookCrudService.update(TENANT_ID, WEBHOOK_ID, { name: 'New' })).rejects.toThrow(WebhookMessages.NOT_FOUND);
  });

  it('updates and returns webhook without secret', async () => {
    const repo = makeWebhookRepo({ ...mockWebhook, name: 'Updated Hook' });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const result = await WebhookCrudService.update(TENANT_ID, WEBHOOK_ID, { name: 'Updated Hook' });
    expect(result.name).toBe('Updated Hook');
    expect((result as any).secret).toBeUndefined();
  });

  it('can deactivate a webhook', async () => {
    const repo = makeWebhookRepo({ ...mockWebhook, isActive: false });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const result = await WebhookCrudService.update(TENANT_ID, WEBHOOK_ID, { isActive: false });
    expect(result.isActive).toBe(false);
  });
});

describe('WebhookCrudService.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when webhook does not exist', async () => {
    setupTenantDs(null);
    await expect(WebhookCrudService.delete(TENANT_ID, WEBHOOK_ID)).rejects.toThrow(WebhookMessages.NOT_FOUND);
  });

  it('calls repo.remove when webhook exists', async () => {
    const repo = makeWebhookRepo(mockWebhook);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    await WebhookCrudService.delete(TENANT_ID, WEBHOOK_ID);
    expect(repo.remove).toHaveBeenCalled();
  });
});

