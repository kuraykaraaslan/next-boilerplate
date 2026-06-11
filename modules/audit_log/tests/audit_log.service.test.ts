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
  tenantDataSourceFor: vi.fn(),
  getSystemDataSource: vi.fn(),
}));

vi.mock('@/modules/webhook/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => undefined) },
}));

vi.mock('@/modules/setting/setting.service', () => ({
  default: { getValue: vi.fn(async () => null) },
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

import AuditLogService from '../audit_log.service';
import { tenantDataSourceFor, getSystemDataSource } from '@/modules/db';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import SettingService from '@/modules/setting/setting.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const ACTOR_ID = '660e8400-e29b-41d4-a716-446655440001';
const LOG_ID = '770e8400-e29b-41d4-a716-446655440002';

const mockLog = {
  auditLogId: LOG_ID,
  tenantId: TENANT_ID,
  actorId: ACTOR_ID,
  actorType: 'USER' as const,
  onBehalfOfActorId: null,
  action: 'auth.login',
  severity: 'low' as const,
  resourceType: null,
  resourceId: null,
  metadata: null,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  prevHash: null,
  rowHash: null,
  createdAt: new Date('2024-01-01'),
};

function makeRepo(rows: any[] = [mockLog]) {
  const find = vi.fn(async () => rows);
  const findOne = vi.fn(async () => null);
  const count = vi.fn(async () => rows.length);
  const create = vi.fn((data: any) => ({ ...mockLog, ...data }));
  const save = vi.fn(async (entity: any) => entity);
  const del = vi.fn(async () => ({ affected: rows.length }));
  return { find, findOne, count, create, save, delete: del };
}

describe('AuditLogService.log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes to root-tenant DB when tenantId is absent', async () => {
    const repo = makeRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.log({ action: 'user.created', actorType: 'SYSTEM' });
    expect(tenantDataSourceFor).toHaveBeenCalledWith(ROOT_TENANT_ID);
    expect(repo.save).toHaveBeenCalled();
  });

  it('writes to tenant DB when tenantId is provided', async () => {
    const repo = makeRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.log({ action: 'auth.login', actorType: 'USER', tenantId: TENANT_ID });
    expect(tenantDataSourceFor).toHaveBeenCalledWith(TENANT_ID);
    expect(repo.save).toHaveBeenCalled();
  });

  it('does not throw even when DB save fails (swallows errors)', async () => {
    (tenantDataSourceFor as any).mockRejectedValue(new Error('DB down'));
    await expect(AuditLogService.log({ action: 'auth.login', actorType: 'SYSTEM' })).resolves.toBeUndefined();
    expect((Logger as any).error).toHaveBeenCalled();
  });

  it('logs an info message on success', async () => {
    const repo = makeRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    await AuditLogService.log({ action: 'tenant.created', actorType: 'SYSTEM' });
    expect((Logger as any).info).toHaveBeenCalled();
  });
});

describe('AuditLogService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns logs and total from root-tenant DB when no tenantId', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.getAll({ page: 1, pageSize: 20 });
    expect(tenantDataSourceFor).toHaveBeenCalledWith(ROOT_TENANT_ID);
    expect(result.total).toBe(1);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe('auth.login');
  });

  it('returns logs from tenant DB when tenantId is provided', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.getAll({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect(tenantDataSourceFor).toHaveBeenCalledWith(TENANT_ID);
    expect(result.total).toBe(1);
    expect(result.logs[0].tenantId).toBe(TENANT_ID);
  });

  it('returns empty list when no logs exist', async () => {
    const repo = makeRepo([]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.getAll({ page: 1, pageSize: 20 });
    expect(result.logs).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('applies actorId filter', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.getAll({ actorId: ACTOR_ID, page: 1, pageSize: 20 });
    const findCall = (repo.find.mock.calls as any[][])[0]![0];
    expect(findCall.where.actorId).toBe(ACTOR_ID);
  });

  it('applies severity filter', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.getAll({ severity: 'critical', page: 1, pageSize: 20 });
    const findCall = (repo.find.mock.calls as any[][])[0]![0];
    expect(findCall.where.severity).toBe('critical');
  });

  it('applies a fromDate/toDate range filter', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.getAll({ fromDate: '2024-01-01', toDate: '2024-02-01', page: 1, pageSize: 20 });
    const findCall = (repo.find.mock.calls as any[][])[0]![0];
    // Between(...) yields a FindOperator — assert one is present on createdAt.
    expect(findCall.where.createdAt).toBeDefined();
  });
});

describe('AuditLogService severity + high-risk webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('derives severity from the action and writes it', async () => {
    const repo = makeRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.log({ action: 'auth.login', actorType: 'USER', tenantId: TENANT_ID });
    const saved = (repo.save.mock.calls as any[][])[0]![0];
    expect(saved.severity).toBe('low');
    expect(WebhookService.dispatchEvent).not.toHaveBeenCalled();
  });

  it('fires the audit.high_risk webhook on a critical action', async () => {
    const repo = makeRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.log({ action: 'impersonation.started', actorType: 'USER', tenantId: TENANT_ID });
    const saved = (repo.save.mock.calls as any[][])[0]![0];
    expect(saved.severity).toBe('critical');
    expect(WebhookService.dispatchEvent).toHaveBeenCalledWith(
      TENANT_ID,
      'audit.high_risk',
      expect.objectContaining({ action: 'impersonation.started', severity: 'critical' }),
    );
  });

  it('does not throw when the high-risk webhook rejects', async () => {
    const repo = makeRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    (WebhookService.dispatchEvent as any).mockRejectedValueOnce(new Error('webhook down'));

    await expect(
      AuditLogService.log({ action: 'auth.account_locked', actorType: 'SYSTEM', tenantId: TENANT_ID }),
    ).resolves.toBeUndefined();
  });

  it('persists prevHash/rowHash and chains to the previous row', async () => {
    const repo = makeRepo();
    repo.findOne.mockResolvedValueOnce({ ...mockLog, rowHash: 'PREVHASH' } as any);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.log({ action: 'auth.login', actorType: 'USER', tenantId: TENANT_ID });
    const saved = (repo.save.mock.calls as any[][])[0]![0];
    expect(saved.prevHash).toBe('PREVHASH');
    expect(typeof saved.rowHash).toBe('string');
    expect(saved.rowHash).toHaveLength(64); // sha256 hex
  });
});

describe('AuditLogService.purgeExpired', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is a no-op when retention is keep-forever (0/unset)', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    (SettingService.getValue as any).mockResolvedValue(null);

    const result = await AuditLogService.purgeExpired({ tenantId: TENANT_ID, archive: false });
    expect(result.purged).toBe(0);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('hard-deletes rows older than the retention window', async () => {
    const oldRow = { ...mockLog, auditLogId: LOG_ID, createdAt: new Date('2000-01-01') };
    const repo = makeRepo([oldRow]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    (SettingService.getValue as any).mockResolvedValue('30');

    const result = await AuditLogService.purgeExpired({ tenantId: TENANT_ID, archive: false });
    expect(result.purged).toBe(1);
    expect(repo.delete).toHaveBeenCalledWith([LOG_ID]);
  });

  it('returns NDJSON archive when archive=true and no exporter given', async () => {
    const oldRow = { ...mockLog, createdAt: new Date('2000-01-01') };
    const repo = makeRepo([oldRow]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    (SettingService.getValue as any).mockResolvedValue('30');

    const result = await AuditLogService.purgeExpired({ tenantId: TENANT_ID, archive: true });
    expect(result.archive).toBeTypeOf('string');
    expect(result.archive!.length).toBeGreaterThan(0);
  });

  it('hands the batch to the exporter when one is provided', async () => {
    const oldRow = { ...mockLog, createdAt: new Date('2000-01-01') };
    const repo = makeRepo([oldRow]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    (SettingService.getValue as any).mockResolvedValue('30');
    const exporter = { export: vi.fn(async () => undefined) };

    const result = await AuditLogService.purgeExpired({ tenantId: TENANT_ID, archive: true }, exporter);
    expect(exporter.export).toHaveBeenCalledWith(TENANT_ID, expect.any(String), 1);
    expect(result.archive).toBeNull();
  });
});

describe('AuditLogService.anonymizeActor + scrubMetadata', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nulls actorId/onBehalfOfActorId and scrubs PII metadata, preserving action', async () => {
    const row: any = {
      ...mockLog,
      actorId: ACTOR_ID,
      onBehalfOfActorId: ACTOR_ID,
      metadata: { email: 'a@b.com', reason: 'because', plan: 'pro' },
    };
    const repo = makeRepo([row]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.anonymizeActor({ tenantId: TENANT_ID, actorId: ACTOR_ID });
    expect(result.anonymized).toBe(1);
    expect(row.actorId).toBeNull();
    expect(row.onBehalfOfActorId).toBeNull();
    expect(row.ipAddress).toBeNull();
    expect(row.action).toBe('auth.login'); // preserved
    expect(row.metadata.email).toBeUndefined();
    expect(row.metadata.reason).toBeUndefined();
    expect(row.metadata.plan).toBe('pro'); // non-PII preserved
    expect(row.metadata.anonymizedActor).toMatch(/^anon:/);
  });

  it('scrubMetadata strips PII keys recursively', () => {
    const out = AuditLogService.scrubMetadata({ email: 'x@y.z', nested: { name: 'Jo', keep: 1 } });
    expect(out).toEqual({ nested: { keep: 1 } });
  });
});

describe('AuditLogService.verifyChain', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ok=true for a correctly chained set of rows', async () => {
    // Build two rows whose hashes chain correctly.
    const r1: any = { ...mockLog, auditLogId: 'r1', prevHash: null, createdAt: new Date('2024-01-01') };
    r1.rowHash = AuditLogService.computeRowHash(null, {
      tenantId: r1.tenantId, actorId: r1.actorId, actorType: r1.actorType,
      onBehalfOfActorId: r1.onBehalfOfActorId, action: r1.action, severity: r1.severity,
      resourceType: r1.resourceType, resourceId: r1.resourceId, metadata: r1.metadata, createdAt: r1.createdAt,
    });
    const r2: any = { ...mockLog, auditLogId: 'r2', prevHash: r1.rowHash, action: 'auth.logout', createdAt: new Date('2024-01-02') };
    r2.rowHash = AuditLogService.computeRowHash(r1.rowHash, {
      tenantId: r2.tenantId, actorId: r2.actorId, actorType: r2.actorType,
      onBehalfOfActorId: r2.onBehalfOfActorId, action: r2.action, severity: r2.severity,
      resourceType: r2.resourceType, resourceId: r2.resourceId, metadata: r2.metadata, createdAt: r2.createdAt,
    });
    const repo = makeRepo([r1, r2]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.verifyChain(TENANT_ID);
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(2);
    expect(result.brokenAt).toBeNull();
  });

  it('detects a tampered row', async () => {
    const r1: any = { ...mockLog, auditLogId: 'r1', prevHash: null, rowHash: 'NOT_THE_REAL_HASH', createdAt: new Date('2024-01-01') };
    const repo = makeRepo([r1]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.verifyChain(TENANT_ID);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe('r1');
  });
});

describe('AuditLogService.queryCrossTenant (root only)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-root callers with 403', async () => {
    await expect(
      AuditLogService.queryCrossTenant(TENANT_ID, { limit: 50 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('aggregates rows across tenants for the root caller', async () => {
    (getSystemDataSource as any).mockResolvedValue({
      getRepository: () => ({ find: vi.fn(async () => [{ tenantId: 't1' }, { tenantId: 't2' }]) }),
    });
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.queryCrossTenant(ROOT_TENANT_ID, { limit: 50 });
    expect(result.total).toBe(2); // one row per tenant
    expect(result.logs.length).toBeGreaterThan(0);
  });
});

describe('AuditLogService.exportLogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('produces NDJSON by default', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.exportLogs({ tenantId: TENANT_ID, format: 'ndjson' });
    expect(result.format).toBe('ndjson');
    expect(result.count).toBe(1);
    expect(() => JSON.parse(result.body.split('\n')[0])).not.toThrow();
  });

  it('produces CSV with a header row', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.exportLogs({ tenantId: TENANT_ID, format: 'csv' });
    expect(result.format).toBe('csv');
    expect(result.body.split('\n')[0]).toContain('auditLogId');
  });
});
