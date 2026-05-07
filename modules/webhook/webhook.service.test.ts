import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

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

vi.mock('@/libs/redis/bullmq', () => ({
  getBullMQConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
}));

import WebhookService from './webhook.service';
import { tenantDataSourceFor } from '@/libs/typeorm';
import WebhookMessages from './webhook.messages';

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
  events: ['member.created', 'tenant.updated'],
  isActive: true,
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

describe('WebhookService.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns webhooks and total', async () => {
    setupTenantDs(mockWebhook);
    const result = await WebhookService.list({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.webhooks).toHaveLength(1);
    expect(result.webhooks[0].webhookId).toBe(WEBHOOK_ID);
  });

  it('does not expose secret in returned webhooks', async () => {
    setupTenantDs(mockWebhook);
    const result = await WebhookService.list({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect((result.webhooks[0] as any).secret).toBeUndefined();
  });
});

describe('WebhookService.getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when webhook does not exist', async () => {
    setupTenantDs(null);
    await expect(WebhookService.getById(TENANT_ID, WEBHOOK_ID)).rejects.toThrow(WebhookMessages.NOT_FOUND);
  });

  it('returns SafeWebhook on success', async () => {
    setupTenantDs(mockWebhook);
    const result = await WebhookService.getById(TENANT_ID, WEBHOOK_ID);
    expect(result.webhookId).toBe(WEBHOOK_ID);
    expect((result as any).secret).toBeUndefined();
  });
});

describe('WebhookService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a webhook and returns SafeWebhook', async () => {
    const repo = makeWebhookRepo(mockWebhook);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await WebhookService.create(TENANT_ID, USER_ID, {
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

    await WebhookService.create(TENANT_ID, USER_ID, {
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

    await WebhookService.create(TENANT_ID, USER_ID, {
      name: 'Secure Hook',
      url: 'https://example.com/secure',
      events: ['api_key.created'],
    });

    const createArg = repo.create.mock.calls[0][0];
    expect(createArg.secret).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('WebhookService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when webhook does not exist', async () => {
    setupTenantDs(null);
    await expect(WebhookService.update(TENANT_ID, WEBHOOK_ID, { name: 'New' })).rejects.toThrow(WebhookMessages.NOT_FOUND);
  });

  it('updates and returns webhook without secret', async () => {
    const repo = makeWebhookRepo({ ...mockWebhook, name: 'Updated Hook' });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const result = await WebhookService.update(TENANT_ID, WEBHOOK_ID, { name: 'Updated Hook' });
    expect(result.name).toBe('Updated Hook');
    expect((result as any).secret).toBeUndefined();
  });

  it('can deactivate a webhook', async () => {
    const repo = makeWebhookRepo({ ...mockWebhook, isActive: false });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const result = await WebhookService.update(TENANT_ID, WEBHOOK_ID, { isActive: false });
    expect(result.isActive).toBe(false);
  });
});

describe('WebhookService.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when webhook does not exist', async () => {
    setupTenantDs(null);
    await expect(WebhookService.delete(TENANT_ID, WEBHOOK_ID)).rejects.toThrow(WebhookMessages.NOT_FOUND);
  });

  it('calls repo.remove when webhook exists', async () => {
    const repo = makeWebhookRepo(mockWebhook);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    await WebhookService.delete(TENANT_ID, WEBHOOK_ID);
    expect(repo.remove).toHaveBeenCalled();
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
});
