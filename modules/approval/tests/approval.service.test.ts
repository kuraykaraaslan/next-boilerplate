import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

vi.mock('@/modules/env', () => ({
  env: { DATABASE_URL: 'postgresql://test', NODE_ENV: 'test' },
}));
vi.mock('@/modules/redis', () => ({
  default: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1) },
}));
vi.mock('@/modules/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/modules/webhook/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));
vi.mock('@/modules/db', () => ({ tenantDataSourceFor: vi.fn() }));
const { auditLog, notify } = vi.hoisted(() => ({
  auditLog: vi.fn(async (_input: Record<string, unknown>) => {}),
  notify: vi.fn(async (_tenantId: string, _userId: string, _payload: Record<string, unknown>) => null),
}));
vi.mock('@/modules/audit_log/audit_log.service', () => ({ default: { log: auditLog } }));
vi.mock('@/modules/notification_inapp/notification_inapp.service', () => ({ default: { push: notify } }));

import { tenantDataSourceFor } from '@/modules/db';
import ApprovalQueueService from '../approval.service';
import { APPROVAL_MESSAGES } from '../approval.messages';
import { makeFakeDs, type FakeDs } from './fake_ds';

const TENANT = '660e8400-e29b-41d4-a716-446655440000';
const SUBMITTER = '770e8400-e29b-41d4-a716-446655440001';
const REVIEWER = '770e8400-e29b-41d4-a716-446655440002';
const ENTITY_A = '880e8400-e29b-41d4-a716-446655440010';
const ENTITY_B = '880e8400-e29b-41d4-a716-446655440011';

let fake: FakeDs;

beforeEach(() => {
  fake = makeFakeDs();
  (tenantDataSourceFor as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(fake);
  auditLog.mockClear();
  notify.mockClear();
});

describe('ApprovalQueueService.submit', () => {
  it('creates a PENDING item with an SLA and a hash link', async () => {
    const item = await ApprovalQueueService.submit(TENANT, {
      entityType: 'store_product',
      entityId: ENTITY_A,
      submittedByUserId: SUBMITTER,
      priority: 2,
    });
    expect(item.status).toBe('PENDING');
    expect(item.priority).toBe(2);
    expect(item.slaDueAt).toBeInstanceOf(Date);
    expect(item.rowHash).toBeTruthy();
    expect(item.prevHash).toBeNull();
  });

  it('is idempotent — a second submit for the same open entity returns the same item', async () => {
    const first = await ApprovalQueueService.submit(TENANT, { entityType: 'blog_post', entityId: ENTITY_A, priority: 0 });
    const second = await ApprovalQueueService.submit(TENANT, { entityType: 'blog_post', entityId: ENTITY_A, priority: 0 });
    expect(second.approvalItemId).toBe(first.approvalItemId);
    expect(fake.store.ApprovalQueueItem.length).toBe(1);
  });
});

describe('ApprovalQueueService lifecycle', () => {
  it('PENDING → IN_REVIEW → APPROVED writes an audit log and notifies the submitter', async () => {
    const item = await ApprovalQueueService.submit(TENANT, {
      entityType: 'store_product',
      entityId: ENTITY_A,
      submittedByUserId: SUBMITTER,
      priority: 1,
    });
    const claimed = await ApprovalQueueService.claim(TENANT, REVIEWER, item.approvalItemId);
    expect(claimed.status).toBe('IN_REVIEW');
    expect(claimed.reviewedByUserId).toBe(REVIEWER);

    const decided = await ApprovalQueueService.decide(TENANT, REVIEWER, item.approvalItemId, {
      decision: 'APPROVE',
      note: 'looks good',
    });
    expect(decided.status).toBe('APPROVED');
    expect(decided.reviewedAt).toBeInstanceOf(Date);
    expect(decided.decisionNote).toBe('looks good');

    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog.mock.calls[0][0]).toMatchObject({
      action: 'approval.approve',
      resourceType: 'store_product',
      resourceId: ENTITY_A,
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][1]).toBe(SUBMITTER);
  });

  it('invokes a registered decision handler on terminal decisions only', async () => {
    const handler = vi.fn();
    ApprovalQueueService.registerHandler('custom', handler);
    try {
      const item = await ApprovalQueueService.submit(TENANT, { entityType: 'custom', entityId: ENTITY_B, priority: 0 });
      await ApprovalQueueService.decide(TENANT, REVIEWER, item.approvalItemId, { decision: 'ESCALATE' });
      // escalate is non-terminal → handler not called yet
      expect(handler).not.toHaveBeenCalled();
      await ApprovalQueueService.decide(TENANT, REVIEWER, item.approvalItemId, { decision: 'REJECT' });
      // allow the fire-and-forget microtask to run
      await new Promise((r) => setTimeout(r, 0));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].item.entityType).toBe('custom');
    } finally {
      ApprovalQueueService.unregisterHandler('custom');
    }
  });

  it('rejects an invalid transition (deciding an already-terminal item)', async () => {
    const item = await ApprovalQueueService.submit(TENANT, { entityType: 'custom', entityId: ENTITY_A, priority: 0 });
    await ApprovalQueueService.decide(TENANT, REVIEWER, item.approvalItemId, { decision: 'APPROVE' });
    await expect(
      ApprovalQueueService.decide(TENANT, REVIEWER, item.approvalItemId, { decision: 'REJECT' }),
    ).rejects.toThrow(APPROVAL_MESSAGES.ALREADY_DECIDED);
  });

  it('allows re-submission after a terminal decision (partial unique only on open states)', async () => {
    const first = await ApprovalQueueService.submit(TENANT, { entityType: 'custom', entityId: ENTITY_A, priority: 0 });
    await ApprovalQueueService.decide(TENANT, REVIEWER, first.approvalItemId, { decision: 'REJECT' });
    const second = await ApprovalQueueService.submit(TENANT, { entityType: 'custom', entityId: ENTITY_A, priority: 0 });
    expect(second.approvalItemId).not.toBe(first.approvalItemId);
    expect(second.status).toBe('PENDING');
  });
});

describe('ApprovalQueueService.verifyChain', () => {
  it('passes for an untampered queue across mutations', async () => {
    const a = await ApprovalQueueService.submit(TENANT, { entityType: 'custom', entityId: ENTITY_A, priority: 0 });
    await ApprovalQueueService.submit(TENANT, { entityType: 'custom', entityId: ENTITY_B, priority: 0 });
    await ApprovalQueueService.claim(TENANT, REVIEWER, a.approvalItemId);
    await ApprovalQueueService.decide(TENANT, REVIEWER, a.approvalItemId, { decision: 'APPROVE' });
    const res = await ApprovalQueueService.verifyChain(TENANT);
    expect(res.ok).toBe(true);
    expect(res.checked).toBe(2);
  });

  it('detects a tampered immutable field', async () => {
    await ApprovalQueueService.submit(TENANT, { entityType: 'custom', entityId: ENTITY_A, priority: 0 });
    const row = fake.store.ApprovalQueueItem[0];
    row['reason'] = 'tampered after the fact';
    const res = await ApprovalQueueService.verifyChain(TENANT);
    expect(res.ok).toBe(false);
    expect(res.brokenAt).toBe(row['approvalItemId']);
  });
});
