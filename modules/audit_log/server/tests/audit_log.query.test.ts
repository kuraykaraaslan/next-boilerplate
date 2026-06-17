import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, ACTOR_ID, mockLog, makeRepo } from './audit_log.test-setup';
import AuditLogService from '../audit_log.service';
import { tenantDataSourceFor, getSystemDataSource } from '@kuraykaraaslan/db';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';

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
