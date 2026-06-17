import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('bcrypt', () => ({ default: { hash: vi.fn(async () => 'hashed') } }));
vi.mock('@kuraykaraaslan/observability', () => ({ default: { recordTenantUsage: vi.fn() } }));
vi.mock('@kuraykaraaslan/webhook/server/webhook.service', () => ({ default: { dispatchEvent: vi.fn(async () => {}) } }));
vi.mock('@kuraykaraaslan/tenant/server/tenant.constants', () => ({ ROOT_TENANT_ID: 'root' }));
vi.mock('@kuraykaraaslan/user/server/user.service', () => ({ default: { getByEmail: vi.fn(async () => null), invalidate: vi.fn(async () => {}) } }));
vi.mock('@kuraykaraaslan/tenant/server/tenant.service', () => ({ default: { provisionPersonal: vi.fn() } }));
vi.mock('@kuraykaraaslan/tenant_invitation/server/tenant_invitation.service', () => ({ default: { autoAcceptForEmail: vi.fn() } }));
vi.mock('@kuraykaraaslan/user_security/server/user_security.service', () => ({ default: { pushPasswordHistory: vi.fn(async () => {}) } }));
vi.mock('@kuraykaraaslan/audit_log/server/audit_log.service', () => ({ default: { log: vi.fn(async () => {}) } }));
vi.mock('@kuraykaraaslan/audit_log/server/audit_log.enums', () => ({ AuditActions: { AUTH_DORMANT_DISABLED: 'd' } }));
vi.mock('../auth.captcha.service', () => ({ default: {} }));

const dormantPolicy = vi.fn(async () => ({ days: 90, autoDisable: true, deleteAfterDays: 0 }));
vi.mock('../auth.policy.service', () => ({ default: { getDormantPolicy: (...a: any[]) => dormantPolicy(...(a as [])), getCredentialPolicy: vi.fn(async () => ({ bcryptCost: 10 })) } }));

const queryMock = vi.fn();
const updateExec = vi.fn(async () => ({}));
const userRepo = {
  createQueryBuilder: () => ({ update: () => ({ set: () => ({ whereInIds: () => ({ execute: updateExec }) }) }) }),
  findOne: vi.fn(async () => ({ userId: 'u', email: 'u@x.com' })),
  update: vi.fn(async () => ({})),
};
vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(async () => ({
    query: (...a: any[]) => queryMock(...(a as [])),
    getRepository: () => userRepo,
    transaction: async (fn: any) => fn({ getRepository: () => userRepo }),
  })),
}));

import AuthCredentialService from '../auth.credential.service';

beforeEach(() => {
  vi.clearAllMocks();
  dormantPolicy.mockResolvedValue({ days: 90, autoDisable: true, deleteAfterDays: 0 });
});

describe('disableDormantAccounts (GTH-8 / GTH-15)', () => {
  it('returns zeros when days <= 0', async () => {
    dormantPolicy.mockResolvedValue({ days: 0, autoDisable: true, deleteAfterDays: 0 });
    const res = await AuthCredentialService.disableDormantAccounts('t1');
    expect(res).toEqual({ scanned: 0, disabled: 0, erased: 0 });
  });

  it('dry-run mode (autoDisable=false) scans but disables nothing', async () => {
    dormantPolicy.mockResolvedValue({ days: 90, autoDisable: false, deleteAfterDays: 0 });
    queryMock.mockResolvedValueOnce([{ userId: 'a' }, { userId: 'b' }]);
    const res = await AuthCredentialService.disableDormantAccounts('t1');
    expect(res).toEqual({ scanned: 2, disabled: 0, erased: 0 });
    expect(updateExec).not.toHaveBeenCalled();
  });

  it('disables dormant accounts when autoDisable is true', async () => {
    queryMock.mockResolvedValueOnce([{ userId: 'a' }]);
    const res = await AuthCredentialService.disableDormantAccounts('t1');
    expect(res.scanned).toBe(1);
    expect(res.disabled).toBe(1);
    expect(res.erased).toBe(0);
    expect(updateExec).toHaveBeenCalled();
  });

  it('erases PII when deleteAfterDays > 0 (right-to-erasure)', async () => {
    dormantPolicy.mockResolvedValue({ days: 90, autoDisable: true, deleteAfterDays: 365 });
    // 1st query: dormant disable scan; 2nd query: erase scan
    queryMock
      .mockResolvedValueOnce([{ userId: 'a' }])
      .mockResolvedValueOnce([{ userId: 'a' }]);
    const res = await AuthCredentialService.disableDormantAccounts('t1');
    expect(res.disabled).toBe(1);
    expect(res.erased).toBe(1);
  });
});
