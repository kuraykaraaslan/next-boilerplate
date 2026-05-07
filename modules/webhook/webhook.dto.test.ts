import { describe, it, expect } from 'vitest';
import { CreateWebhookDTO, UpdateWebhookDTO, ListWebhooksDTO, ListDeliveriesDTO } from './webhook.dto';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const WEBHOOK_ID = '660e8400-e29b-41d4-a716-446655440001';

describe('CreateWebhookDTO', () => {
  const validInput = {
    name: 'My Webhook',
    url: 'https://example.com/hook',
    events: ['tenant.updated'],
  };

  it('accepts valid input', () => {
    expect(CreateWebhookDTO.safeParse(validInput).success).toBe(true);
  });

  it('accepts optional description', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, description: 'A useful hook' }).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, name: '' }).success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects description longer than 500 characters', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, description: 'x'.repeat(501) }).success).toBe(false);
  });

  it('rejects invalid URL (not http/https)', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, url: 'ftp://example.com' }).success).toBe(false);
  });

  it('rejects empty URL', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, url: '' }).success).toBe(false);
  });

  it('rejects empty events array', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, events: [] }).success).toBe(false);
  });

  it('rejects invalid event type', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, events: ['order.shipped'] }).success).toBe(false);
  });

  it('accepts multiple valid events', () => {
    const result = CreateWebhookDTO.safeParse({
      ...validInput,
      events: ['member.created', 'member.deleted', 'payment.completed'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts http:// URLs', () => {
    expect(CreateWebhookDTO.safeParse({ ...validInput, url: 'http://localhost:3000/hook' }).success).toBe(true);
  });

  it('rejects missing url', () => {
    const { url: _, ...withoutUrl } = validInput;
    expect(CreateWebhookDTO.safeParse(withoutUrl).success).toBe(false);
  });
});

describe('UpdateWebhookDTO', () => {
  it('accepts empty object (all optional)', () => {
    expect(UpdateWebhookDTO.safeParse({}).success).toBe(true);
  });

  it('accepts isActive boolean', () => {
    expect(UpdateWebhookDTO.safeParse({ isActive: false }).success).toBe(true);
  });

  it('accepts valid url update', () => {
    expect(UpdateWebhookDTO.safeParse({ url: 'https://new.example.com/hook' }).success).toBe(true);
  });

  it('rejects empty name when provided', () => {
    expect(UpdateWebhookDTO.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects invalid url when provided', () => {
    expect(UpdateWebhookDTO.safeParse({ url: 'not-a-url' }).success).toBe(false);
  });

  it('rejects empty events array when provided', () => {
    expect(UpdateWebhookDTO.safeParse({ events: [] }).success).toBe(false);
  });

  it('rejects invalid event type in update', () => {
    expect(UpdateWebhookDTO.safeParse({ events: ['fake.event'] }).success).toBe(false);
  });
});

describe('ListWebhooksDTO', () => {
  it('accepts valid tenantId', () => {
    expect(ListWebhooksDTO.safeParse({ tenantId: TENANT_ID }).success).toBe(true);
  });

  it('defaults page to 1 and pageSize to 20', () => {
    const result = ListWebhooksDTO.safeParse({ tenantId: TENANT_ID });
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('rejects non-uuid tenantId', () => {
    expect(ListWebhooksDTO.safeParse({ tenantId: 'not-uuid' }).success).toBe(false);
  });

  it('rejects page less than 1', () => {
    expect(ListWebhooksDTO.safeParse({ tenantId: TENANT_ID, page: 0 }).success).toBe(false);
  });

  it('rejects pageSize greater than 100', () => {
    expect(ListWebhooksDTO.safeParse({ tenantId: TENANT_ID, pageSize: 101 }).success).toBe(false);
  });
});

describe('ListDeliveriesDTO', () => {
  it('accepts valid tenantId and webhookId', () => {
    const result = ListDeliveriesDTO.safeParse({ tenantId: TENANT_ID, webhookId: WEBHOOK_ID });
    expect(result.success).toBe(true);
  });

  it('rejects missing webhookId', () => {
    expect(ListDeliveriesDTO.safeParse({ tenantId: TENANT_ID }).success).toBe(false);
  });

  it('rejects invalid webhookId UUID', () => {
    expect(ListDeliveriesDTO.safeParse({ tenantId: TENANT_ID, webhookId: 'not-uuid' }).success).toBe(false);
  });

  it('defaults page to 1 and pageSize to 20', () => {
    const result = ListDeliveriesDTO.safeParse({ tenantId: TENANT_ID, webhookId: WEBHOOK_ID });
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });
});
