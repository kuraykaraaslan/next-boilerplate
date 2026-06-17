import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, ACTOR_ID, LOG_ID, mockLog, makeRepo } from './audit_log.test-setup';
import AuditLogService from '../audit_log.service';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import Logger from '@kuraykaraaslan/logger';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';

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
