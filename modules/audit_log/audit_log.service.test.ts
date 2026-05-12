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

import AuditLogService from './audit_log.service';
import { getSystemDataSource, tenantDataSourceFor } from '@/libs/typeorm';
import Logger from '@/libs/logger';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const ACTOR_ID = '660e8400-e29b-41d4-a716-446655440001';
const LOG_ID = '770e8400-e29b-41d4-a716-446655440002';

const mockLog = {
  auditLogId: LOG_ID,
  tenantId: TENANT_ID,
  actorId: ACTOR_ID,
  actorType: 'USER' as const,
  action: 'auth.login',
  resourceType: null,
  resourceId: null,
  metadata: null,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  createdAt: new Date('2024-01-01'),
};

function makeRepo(rows: typeof mockLog[] = [mockLog]) {
  const find = vi.fn(async () => rows);
  const count = vi.fn(async () => rows.length);
  const create = vi.fn((data: any) => ({ ...mockLog, ...data }));
  const save = vi.fn(async (entity: any) => ({ ...mockLog, ...entity }));
  return { find, count, create, save };
}

describe('AuditLogService.log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes to system DB when tenantId is absent', async () => {
    const repo = makeRepo();
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.log({ action: 'user.created', actorType: 'SYSTEM' });
    expect(repo.save).toHaveBeenCalled();
  });

  it('writes to tenant DB when tenantId is provided', async () => {
    const repo = makeRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.log({ action: 'auth.login', actorType: 'USER', tenantId: TENANT_ID });
    expect(repo.save).toHaveBeenCalled();
  });

  it('does not throw even when DB save fails (swallows errors)', async () => {
    (getSystemDataSource as any).mockRejectedValue(new Error('DB down'));
    await expect(AuditLogService.log({ action: 'auth.login' })).resolves.toBeUndefined();
    expect((Logger as any).error).toHaveBeenCalled();
  });

  it('logs an info message on success', async () => {
    const repo = makeRepo();
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
    await AuditLogService.log({ action: 'tenant.created', actorType: 'SYSTEM' });
    expect((Logger as any).info).toHaveBeenCalled();
  });
});

describe('AuditLogService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns logs and total from system DB when no tenantId', async () => {
    const repo = makeRepo([mockLog]);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.getAll({ page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe('auth.login');
  });

  it('returns logs from tenant DB when tenantId is provided', async () => {
    const repo = makeRepo([mockLog]);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.getAll({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.logs[0].tenantId).toBe(TENANT_ID);
  });

  it('returns empty list when no logs exist', async () => {
    const repo = makeRepo([]);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await AuditLogService.getAll({ page: 1, pageSize: 20 });
    expect(result.logs).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('applies actorId filter', async () => {
    const repo = makeRepo([mockLog]);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    await AuditLogService.getAll({ actorId: ACTOR_ID, page: 1, pageSize: 20 });
    const findCall = repo.find.mock.calls[0][0];
    expect(findCall.where.actorId).toBe(ACTOR_ID);
  });
});
