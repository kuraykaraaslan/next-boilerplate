import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, mockTenant, makeRepo, mockDefaultDs, mockTenantDs } from './tenant.test-setup';
import TenantService from '../tenant.service';
import TenantMessages from '../tenant.messages';
import TenantMemberService from '../../tenant_member/tenant_member.service';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import TenantPlanService from '@/modules/tenant_subscription/tenant_subscription.plan.service';
import SettingService from '@/modules/setting/setting.service';

beforeEach(() => vi.clearAllMocks());

describe('TenantService.create', () => {
  it('creates and returns a new tenant', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    const result = await TenantService.create({ name: 'New Tenant', description: null, region: 'TR' });
    expect(result.name).toBe('New Tenant');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Tenant', tenantStatus: 'ACTIVE' }));
    expect(repo.save).toHaveBeenCalled();
  });

  it('does not pass `defaults` field through to repo.create', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    await TenantService.create({ name: 'New Tenant', description: null, region: 'TR', defaults: { skipPlan: true } });
    const arg = (repo.create as any).mock.calls[0][0];
    expect(arg).not.toHaveProperty('defaults');
  });

  it('seeds default settings (plan/subscription seed currently disabled)', async () => {
    // Plan + subscription auto-seed is intentionally disabled because the new
    // plan model requires a StoreProduct (which needs a Category) and a fresh
    // tenant has no catalog. Settings still seed.
    const repo = makeRepo();
    mockDefaultDs(repo);

    await TenantService.create({ name: 'Seed Tenant', description: null, region: 'TR' });

    expect(TenantPlanService.createPlan).not.toHaveBeenCalled();
    expect(TenantSubscriptionService.assignPlan).not.toHaveBeenCalled();
    expect(SettingService.updateMany).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ language: 'en', dateFormat: 'YYYY-MM-DD', timezone: 'UTC' }),
    );
  });

  it('respects `defaults.skipPlan` and skips subscription too when no plan was created', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    await TenantService.create({ name: 'No-plan Tenant', description: null, region: 'TR', defaults: { skipPlan: true } });

    expect(TenantPlanService.createPlan).not.toHaveBeenCalled();
    expect(TenantSubscriptionService.assignPlan).not.toHaveBeenCalled();
    expect(SettingService.updateMany).toHaveBeenCalled();
  });

  it('respects `defaults.skipSettings`', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);

    await TenantService.create({ name: 'No-settings Tenant', description: null, region: 'TR', defaults: { skipSettings: true } });

    expect(SettingService.updateMany).not.toHaveBeenCalled();
  });

  it('does not auto-seed for the root tenant', async () => {
    const ROOT_ID = '00000000-0000-4000-8000-000000000000';
    const rootTenant = { ...mockTenant, tenantId: ROOT_ID };
    const repo = makeRepo({
      create: vi.fn((data: any) => ({ ...rootTenant, ...data })),
      save: vi.fn(async (e: any) => ({ ...rootTenant, ...e, tenantId: ROOT_ID })),
    });
    mockDefaultDs(repo);

    await TenantService.create({ name: 'Platform', description: null, region: 'TR' });

    expect(TenantPlanService.createPlan).not.toHaveBeenCalled();
    expect(SettingService.updateMany).not.toHaveBeenCalled();
  });

  it('does not fail the tenant create when plan seed throws', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    (TenantPlanService.createPlan as any).mockRejectedValueOnce(new Error('boom'));

    const result = await TenantService.create({ name: 'Robust Tenant', description: null, region: 'TR' });
    expect(result.name).toBe('Robust Tenant');
    // settings still attempted
    expect(SettingService.updateMany).toHaveBeenCalled();
  });
});

describe('TenantService.update', () => {
  it('updates and returns the tenant', async () => {
    const updatedTenant = { ...mockTenant, name: 'Updated Name' };
    const repo = makeRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockTenant)
        .mockResolvedValueOnce(updatedTenant),
    });
    mockTenantDs(repo);

    const result = await TenantService.update(TENANT_ID, { name: 'Updated Name', description: null, region: undefined });
    expect(result.name).toBe('Updated Name');
    expect(repo.update).toHaveBeenCalled();
  });

  it('throws TENANT_NOT_FOUND when tenant does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(
      TenantService.update(TENANT_ID, { name: 'X', description: null, region: undefined })
    ).rejects.toThrow(TenantMessages.TENANT_NOT_FOUND);
  });
});

describe('TenantService.provisionPersonal', () => {
  it('creates tenant and adds user as OWNER', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    (TenantMemberService.create as any).mockResolvedValue({});

    const result = await TenantService.provisionPersonal('user-1', 'john@example.com');
    expect(result.tenantId).toBe(TENANT_ID);
    expect(TenantMemberService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', memberRole: 'OWNER', memberStatus: 'ACTIVE' })
    );
  });

  it('derives tenant name from email prefix', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    (TenantMemberService.create as any).mockResolvedValue({});

    await TenantService.provisionPersonal('user-1', 'alice@example.com');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'alice', tenantStatus: 'ACTIVE' })
    );
  });

  it('auto-seeds defaults for the new personal tenant', async () => {
    const repo = makeRepo();
    mockDefaultDs(repo);
    (TenantMemberService.create as any).mockResolvedValue({});

    await TenantService.provisionPersonal('user-1', 'bob@example.com');
    // After the service split the inline Free-plan seed is disabled; seedDefaults
    // now only seeds tenant settings (a platform plan is assigned solely when an
    // operator-configured default plan exists, which getDefaultPlanId mocks to null).
    expect(SettingService.updateMany).toHaveBeenCalled();
  });
});

describe('TenantService.delete', () => {
  it('soft-deletes the tenant by setting deletedAt', async () => {
    const repo = makeRepo();
    mockTenantDs(repo);

    await TenantService.delete(TENANT_ID);
    expect(repo.update).toHaveBeenCalledWith(
      { tenantId: TENANT_ID },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });

  it('throws TENANT_NOT_FOUND when tenant does not exist', async () => {
    const repo = makeRepo({ findOne: vi.fn(async () => null) });
    mockTenantDs(repo);

    await expect(TenantService.delete(TENANT_ID)).rejects.toThrow(TenantMessages.TENANT_NOT_FOUND);
  });
});
