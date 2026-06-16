import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, makeTenantSubRepo, mockSystemDs, mockTenantDs } from './tenant_subscription.feature.test-setup';
import { tenantDataSourceFor } from '@nb/db';
import redis from '@nb/redis';
import TenantFeatureGateService from '../tenant_subscription.feature.service';
import { SUBSCRIPTION_MESSAGES } from '../tenant_subscription.messages';

describe('TenantFeatureGateService.checkFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns denied when no subscription exists', async () => {
    mockSystemDs();
    const subRepo = makeTenantSubRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_chat');
    expect(result.allowed).toBe(false);
  });

  it('returns allowed for BOOLEAN feature with value "true"', async () => {
    mockSystemDs();
    mockTenantDs();
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_chat');
    expect(result.allowed).toBe(true);
    expect(result.type).toBe('BOOLEAN');
  });

  it('returns denied for BOOLEAN feature with value "false"', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_export', type: 'BOOLEAN', value: 'false' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_export');
    expect(result.allowed).toBe(false);
  });

  it('returns allowed for LIMIT feature when under limit', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '10' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'max_users', 5);
    expect(result.allowed).toBe(true);
    expect(result.type).toBe('LIMIT');
  });

  it('returns denied for LIMIT feature when at or over limit', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '10' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'max_users', 10);
    expect(result.allowed).toBe(false);
  });

  it('returns denied when subscription is CANCELLED', async () => {
    const cacheData = {
      status: 'CANCELLED',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_chat');
    expect(result.allowed).toBe(false);
  });

  it('returns denied for unknown feature key', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'nonexistent_feature');
    expect(result.allowed).toBe(false);
  });
});

describe('TenantFeatureGateService.assertFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('throws FEATURE_ACCESS_DENIED when boolean feature is denied', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_export', type: 'BOOLEAN', value: 'false' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantFeatureGateService.assertFeatureAccess(TENANT_ID, 'feature_export'))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_ACCESS_DENIED);
  });

  it('throws FEATURE_LIMIT_REACHED when limit feature is exceeded', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '5' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantFeatureGateService.assertFeatureAccess(TENANT_ID, 'max_users', 5))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_LIMIT_REACHED);
  });

  it('resolves when feature is allowed', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantFeatureGateService.assertFeatureAccess(TENANT_ID, 'feature_chat'))
      .resolves.not.toThrow();
  });
});
